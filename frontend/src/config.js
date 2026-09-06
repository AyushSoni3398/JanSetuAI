// WhatsApp intake settings.
//
// Overridable with a frontend/.env file so the number can change without a code
// edit - the Twilio sandbox number and join code differ per account:
//
//   VITE_WHATSAPP_NUMBER=14155238886
//   VITE_WHATSAPP_JOIN_CODE=join example-code
//
// The number must be digits only, with country code and no "+", because that is
// the format wa.me expects in its path.
export const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "14155238886";

// Twilio's sandbox only accepts messages from numbers that have sent the join
// code first. Set to an empty string once running on an approved WhatsApp
// Business number, and the join step disappears from the UI.
export const WHATSAPP_JOIN_CODE =
  import.meta.env.VITE_WHATSAPP_JOIN_CODE ?? "join twilio-trial";

export function whatsappLink(text) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
