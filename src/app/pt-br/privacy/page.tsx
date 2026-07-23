import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { privacyDocuments } from "@/content/revory-legal-documents";
const document = privacyDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "privacy", locale: "pt-BR", title: "Aviso de Privacidade" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="privacy" locale="pt-BR" />; }
