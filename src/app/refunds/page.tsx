import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { refundDocuments } from "@/content/revory-legal-documents";

const document = refundDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "refunds", locale: "en", title: "Cancellation and Refund Policy" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="refunds" locale="en" />; }
