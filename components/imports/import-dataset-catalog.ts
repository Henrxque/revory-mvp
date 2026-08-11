import type { CanonicalEntityType } from "@/domain/revory/contracts";

export type ImportDatasetRequirement = "required" | "recommended" | "optional" | "advanced";

export type ImportDatasetDefinition = {
  description: string;
  entityType: CanonicalEntityType;
  label: string;
  layer: "QUOTE_RECOVERY" | "REVENUE_REALIZATION";
  requirement: ImportDatasetRequirement;
};

export const quoteRecoveryQuickStartDatasets = [
  { description: "Start here. Upload your estimates to create your first Quote Recovery read.", entityType: "ESTIMATE", label: "Estimates", layer: "QUOTE_RECOVERY", requirement: "required" },
  { description: "Add follow-up activity for a stronger, more precise read.", entityType: "ACTIVITY", label: "Activities", layer: "QUOTE_RECOVERY", requirement: "recommended" },
  { description: "Add customer details when they are stored in a separate export.", entityType: "CUSTOMER", label: "Customers", layer: "QUOTE_RECOVERY", requirement: "optional" },
  { description: "Add lead source, owner and sales-stage context when available.", entityType: "LEAD", label: "Leads", layer: "QUOTE_RECOVERY", requirement: "optional" },
] as const satisfies readonly ImportDatasetDefinition[];

export const revenueRealizationAdvancedDatasets = [
  { description: "Job status, contract value and exact estimate references.", entityType: "JOB", label: "Jobs", layer: "REVENUE_REALIZATION", requirement: "advanced" },
  { description: "Observed billing connected to jobs by explicit IDs.", entityType: "INVOICE", label: "Invoices", layer: "REVENUE_REALIZATION", requirement: "advanced" },
  { description: "Observed approved changes and their job references.", entityType: "CHANGE_ORDER", label: "Change orders", layer: "REVENUE_REALIZATION", requirement: "advanced" },
  { description: "Observed job costs; REVORY never guesses margin.", entityType: "COST", label: "Costs", layer: "REVENUE_REALIZATION", requirement: "advanced" },
] as const satisfies readonly ImportDatasetDefinition[];

export const allImportDatasets = [
  ...quoteRecoveryQuickStartDatasets,
  ...revenueRealizationAdvancedDatasets,
] as const;

