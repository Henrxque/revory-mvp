import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { disclosureDocuments } from "@/content/revory-legal-documents";
const document = disclosureDocuments["pt-BR"];
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "responsibleDisclosure", locale: "pt-BR", title: "Divulgação Responsável" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="responsibleDisclosure" locale="pt-BR" />; }
