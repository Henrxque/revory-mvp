import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { privacyDocuments } from "@/content/revory-legal-documents";

const document = privacyDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "privacy", locale: "en", title: "Privacy Notice" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="privacy" locale="en" />; }
