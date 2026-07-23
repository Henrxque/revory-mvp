import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { dpaDocuments } from "@/content/revory-dpa-documents";
const document = dpaDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "dpa", locale: "pt-BR", title: "Aditivo de Tratamento de Dados" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="dpa" locale="pt-BR" />; }
