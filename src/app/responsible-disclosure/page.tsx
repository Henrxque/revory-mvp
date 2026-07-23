import { LegalDocumentPage, buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
import { disclosureDocuments } from "@/content/revory-legal-documents";

const document = disclosureDocuments.en;
export const metadata = buildLegalMetadata({ description: document.description, documentKey: "responsibleDisclosure", locale: "en", title: "Responsible Disclosure" });
export default function Page() { return <LegalDocumentPage document={document} documentKey="responsibleDisclosure" locale="en" />; }
