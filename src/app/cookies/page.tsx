import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { cookieDocuments } from "@/content/revory-legal-documents";

const document = cookieDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "cookies", locale: "en", title: "Cookie Notice" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="cookies" locale="en" />; }
