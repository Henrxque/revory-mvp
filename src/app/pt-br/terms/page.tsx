import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { termsDocuments } from "@/content/revory-legal-documents";
const document = termsDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "terms", locale: "pt-BR", title: "Termos de Uso" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="terms" locale="pt-BR" />; }
