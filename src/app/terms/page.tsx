import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { termsDocuments } from "@/content/revory-legal-documents";

const document = termsDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "terms", locale: "en", title: "Terms of Service" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="terms" locale="en" />; }
