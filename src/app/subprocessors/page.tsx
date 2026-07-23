import { SubprocessorDocumentPage } from "@/components/legal/SubprocessorDocumentPage";
import { buildLegalMetadata } from "@/components/legal/LegalDocumentPage";

export const metadata = buildLegalMetadata({ description: "Providers used to operate REVORY and their current data boundaries.", documentKey: "subprocessors", locale: "en", title: "Subprocessor Notice" });
export default function Page() { return <SubprocessorDocumentPage locale="en" />; }
