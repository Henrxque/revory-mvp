import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { securityDocuments } from "@/content/revory-legal-documents";

const document = securityDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "security", locale: "en", title: "Security Overview" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="security" locale="en" />; }
