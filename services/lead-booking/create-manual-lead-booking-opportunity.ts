import "server-only";

import {
  AppointmentStatus,
  CommunicationChannel,
  DataSourceType,
  type ActivationSetup,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { evaluateLeadBookingOpportunity } from "@/services/lead-booking/opportunity-readiness";

type CreateManualLeadBookingOpportunityInput = {
  activationSetup: Pick<ActivationSetup, "primaryChannel" | "selectedTemplate">;
  email: string | null;
  fullName: string;
  phone: string | null;
  sourceLabel: string | null;
  workspaceId: string;
};

type CreateManualLeadBookingOpportunityResult = {
  clientName: string;
  opportunityId: string;
  status: "BLOCKED" | "BOOKED" | "CLOSED" | "OPEN" | "READY";
};

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: string | null) {
  const trimmed = value?.trim().toLowerCase() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(value: string | null) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSourceLabel(value: string | null) {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function resolveIntakeChannel(email: string | null, phone: string | null) {
  if (email) {
    return CommunicationChannel.EMAIL;
  }

  if (phone) {
    return CommunicationChannel.SMS;
  }

  return null;
}

function splitName(fullName: string) {
  const parts = normalizeName(fullName).split(" ");

  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

async function findExistingClient(input: {
  email: string | null;
  phone: string | null;
  workspaceId: string;
}) {
  const [emailClient, phoneClient] = await Promise.all([
    input.email
      ? prisma.client.findFirst({
          where: {
            email: input.email,
            workspaceId: input.workspaceId,
          },
        })
      : Promise.resolve(null),
    input.phone
      ? prisma.client.findFirst({
          where: {
            phone: input.phone,
            workspaceId: input.workspaceId,
          },
        })
      : Promise.resolve(null),
  ]);

  if (emailClient && phoneClient && emailClient.id !== phoneClient.id) {
    throw new Error(
      "REVORY found conflicting lead identity for this quick add. Review the existing email and phone before creating a new booking read.",
    );
  }

  return emailClient ?? phoneClient;
}

export async function createManualLeadBookingOpportunity(
  input: CreateManualLeadBookingOpportunityInput,
): Promise<CreateManualLeadBookingOpportunityResult> {
  const fullName = normalizeName(input.fullName);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const sourceLabel = normalizeSourceLabel(input.sourceLabel);

  if (!fullName) {
    throw new Error("REVORY needs the lead name before this quick add can create a booking read.");
  }

  if (!email && !phone) {
    throw new Error(
      "REVORY needs at least one contact detail before this quick add can create a booking read.",
    );
  }

  const { firstName, lastName } = splitName(fullName);
  const existingClient = await findExistingClient({
    email,
    phone,
    workspaceId: input.workspaceId,
  });

  const client = existingClient
    ? await prisma.client.update({
        data: {
          email: email ?? existingClient.email,
          firstName: firstName ?? existingClient.firstName,
          fullName,
          hasLeadBaseSupport: true,
          lastName: lastName ?? existingClient.lastName,
          phone: phone ?? existingClient.phone,
        },
        where: {
          id: existingClient.id,
        },
      })
    : await prisma.client.create({
        data: {
          email,
          firstName,
          fullName,
          hasLeadBaseSupport: true,
          lastName,
          phone,
          workspace: {
            connect: {
              id: input.workspaceId,
            },
          },
        },
      });

  const hasFutureBooking = Boolean(
    await prisma.appointment.findFirst({
      select: {
        id: true,
      },
      where: {
        clientId: client.id,
        scheduledAt: {
          gte: new Date(),
        },
        status: AppointmentStatus.SCHEDULED,
        workspaceId: input.workspaceId,
      },
    }),
  );
  const existingOpportunity = await prisma.leadBookingOpportunity.findUnique({
    select: {
      intakeSourceName: true,
      intakeSourceType: true,
    },
    where: {
      clientId: client.id,
    },
  });

  const opportunityState = evaluateLeadBookingOpportunity({
    bookingPath: input.activationSetup.primaryChannel ?? null,
    email: client.email,
    hasFutureBooking,
    mainOfferKey: input.activationSetup.selectedTemplate ?? null,
    phone: client.phone,
  });

  const intakeChannel = resolveIntakeChannel(client.email, client.phone);
  const intakeSourceName = existingOpportunity?.intakeSourceName ?? sourceLabel ?? "Manual quick add";
  const intakeSourceType = existingOpportunity?.intakeSourceType ?? DataSourceType.MANUAL_IMPORT;
  const opportunity = await prisma.leadBookingOpportunity.upsert({
    create: {
      blockingReason: opportunityState.blockingReason,
      bookingPath: input.activationSetup.primaryChannel ?? null,
      client: {
        connect: {
          id: client.id,
        },
      },
      intakeChannel,
      intakeSourceName,
      intakeSourceType,
      mainOfferKey: input.activationSetup.selectedTemplate ?? null,
      nextAction: opportunityState.nextAction,
      openedAt: new Date(),
      resolvedAt: opportunityState.resolvedAt,
      status: opportunityState.status,
      workspace: {
        connect: {
          id: input.workspaceId,
        },
      },
    },
    update: {
      blockingReason: opportunityState.blockingReason,
      bookingPath: input.activationSetup.primaryChannel ?? null,
      intakeChannel,
      intakeSourceName,
      intakeSourceType,
      mainOfferKey: input.activationSetup.selectedTemplate ?? null,
      nextAction: opportunityState.nextAction,
      resolvedAt: opportunityState.resolvedAt,
      status: opportunityState.status,
    },
    where: {
      clientId: client.id,
    },
  });

  return {
    clientName: client.fullName?.trim() || fullName,
    opportunityId: opportunity.id,
    status: opportunity.status,
  };
}
