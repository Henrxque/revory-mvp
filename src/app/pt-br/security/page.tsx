import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { securityDocuments } from "@/content/revory-legal-documents";
const document = securityDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "security", locale: "pt-BR", title: "Visão Geral de Segurança" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="security" locale="pt-BR" />; }
