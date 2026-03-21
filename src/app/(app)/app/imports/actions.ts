"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  REVORY_CSV_ALLOWED_EXTENSION,
  REVORY_CSV_MAX_FILE_SIZE_BYTES,
} from "@/lib/imports/csv-upload";
import { getAppContext } from "@/services/app/get-app-context";
import { registerCsvUploadMetadata } from "@/services/imports/register-csv-upload";
import {
  getOnboardingStepPath,
  resolveOnboardingStepKey,
} from "@/services/onboarding/wizard-steps";
import type {
  RevoryCsvTemplateKey,
  RevoryCsvUploadActionState,
} from "@/types/imports";

const initialUploadState: RevoryCsvUploadActionState = {
  status: "idle",
};

function isTemplateKey(value: string): value is RevoryCsvTemplateKey {
  return value === "appointments" || value === "clients";
}

function getFileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

export async function uploadCsvFile(
  _previousState: RevoryCsvUploadActionState,
  formData: FormData,
): Promise<RevoryCsvUploadActionState> {
  const appContext = await getAppContext();

  if (!appContext) {
    redirect("/sign-in");
  }

  if (!appContext.activationSetup.isCompleted) {
    redirect(
      getOnboardingStepPath(
        resolveOnboardingStepKey(appContext.activationSetup.currentStep),
      ),
    );
  }

  const templateKeyValue = formData.get("templateKey");
  const fileValue = formData.get("file");

  if (typeof templateKeyValue !== "string" || !isTemplateKey(templateKeyValue)) {
    return {
      message: "Select a valid REVORY CSV import type before uploading.",
      status: "error",
    };
  }

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return {
      message: "Choose a CSV file before continuing.",
      status: "error",
    };
  }

  if (getFileExtension(fileValue.name) !== REVORY_CSV_ALLOWED_EXTENSION) {
    return {
      message: "Upload a file with the .csv extension.",
      status: "error",
    };
  }

  if (fileValue.size > REVORY_CSV_MAX_FILE_SIZE_BYTES) {
    return {
      message: "The CSV file is larger than the current REVORY upload limit.",
      status: "error",
    };
  }

  const dataSource = await registerCsvUploadMetadata({
    fileName: fileValue.name,
    fileSizeBytes: fileValue.size,
    mimeType: fileValue.type || null,
    templateKey: templateKeyValue,
    workspaceId: appContext.workspace.id,
  });

  revalidatePath("/app/imports");
  revalidatePath("/app/dashboard");

  return {
    fileName: dataSource.lastImportFileName ?? fileValue.name,
    message:
      "CSV received successfully. Metadata is registered and the source is ready for parsing next.",
    receivedAt: dataSource.lastImportedAt?.toISOString(),
    status: "success",
  };
}

export { initialUploadState };
