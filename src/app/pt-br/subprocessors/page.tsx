import { SubprocessorDocumentPage } from "@/components/legal/SubprocessorDocumentPage";
import { buildLegalMetadata } from "@/components/legal/LegalDocumentPage";
export const metadata = buildLegalMetadata({ description: "Provedores usados para operar o REVORY e seus limites atuais de dados.", documentKey: "subprocessors", locale: "pt-BR", title: "Aviso de Suboperadores" });
export default function Page() { return <SubprocessorDocumentPage locale="pt-BR" />; }
