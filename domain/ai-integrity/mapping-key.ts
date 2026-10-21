export function stripeCustomerMappingKey(sourceSystem: string, customerExternalId: string) {
  return `${encodeURIComponent(sourceSystem.trim())}|${encodeURIComponent(customerExternalId.trim())}`;
}

export function providerProjectMappingKey(provider: string, organizationId: string | null, projectId: string) {
  return `${encodeURIComponent(provider.trim().toLowerCase())}|${encodeURIComponent(organizationId?.trim() ?? "")}|${encodeURIComponent(projectId.trim())}`;
}
