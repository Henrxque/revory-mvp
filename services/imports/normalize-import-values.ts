import { AppointmentStatus } from "@prisma/client";

export function normalizeName(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function normalizeEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue.includes("@")) {
    return null;
  }

  return normalizedValue;
}

export function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  const hasInternationalPrefix = trimmedValue.startsWith("+");
  const digitsOnly = trimmedValue.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  return hasInternationalPrefix ? `+${digitsOnly}` : digitsOnly;
}

export function normalizeOptionalText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function normalizeAppointmentStatus(value: string | null | undefined) {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  const statusKey = normalizedValue.replace(/[\s-]+/g, "_").toUpperCase();

  switch (statusKey) {
    case AppointmentStatus.SCHEDULED:
      return AppointmentStatus.SCHEDULED;
    case AppointmentStatus.COMPLETED:
      return AppointmentStatus.COMPLETED;
    case AppointmentStatus.CANCELED:
      return AppointmentStatus.CANCELED;
    case AppointmentStatus.NO_SHOW:
      return AppointmentStatus.NO_SHOW;
    default:
      return null;
  }
}

export function normalizeEstimatedRevenue(value: string | null | undefined) {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  const sanitizedValue = normalizedValue.replace(/[$\s]/g, "").replace(/,/g, "");
  const parsedNumber = Number(sanitizedValue);

  if (!Number.isFinite(parsedNumber)) {
    return null;
  }

  return Math.round(parsedNumber * 100) / 100;
}

export function normalizeInteger(value: string | null | undefined) {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedNumber = Number.parseInt(normalizedValue, 10);

  return Number.isNaN(parsedNumber) ? null : parsedNumber;
}

export function normalizeTagList(value: string | null | undefined) {
  const normalizedValue = normalizeOptionalText(value);

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
