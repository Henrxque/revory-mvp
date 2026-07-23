import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { cookieDocuments } from "@/content/revory-legal-documents";
const document = cookieDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "cookies", locale: "pt-BR", title: "Aviso de Cookies" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="cookies" locale="pt-BR" />; }
