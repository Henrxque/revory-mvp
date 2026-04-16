import "server-only";

export function formatLeadBookingSellerVoice(value: string | null | undefined) {
  switch (value) {
    case "MODE_A":
      return "Calm & Premium";
    case "MODE_B":
      return "Clear & Assertive";
    case "MODE_C":
      return "High-Touch Premium";
    default:
      return "Calm & Premium";
  }
}
