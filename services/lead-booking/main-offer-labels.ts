import "server-only";

export function formatLeadBookingMainOffer(value: string | null | undefined) {
  switch (value) {
    case "INJECTABLES":
      return "Injectables";
    case "LASER_SKIN":
      return "Laser & Skin";
    case "BODY_CONTOURING":
      return "Body Contouring";
    default:
      return "Main offer pending";
  }
}
