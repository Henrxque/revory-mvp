import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { dpaDocuments } from "@/content/revory-dpa-documents";

const document = dpaDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "dpa", locale: "en", title: "Data Processing Addendum" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="dpa" locale="en" />; }
