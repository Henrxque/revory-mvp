import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { refundDocuments } from "@/content/revory-legal-documents";
const document = refundDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "refunds", locale: "pt-BR", title: "Política de Cancelamento e Reembolso" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="refunds" locale="pt-BR" />; }
