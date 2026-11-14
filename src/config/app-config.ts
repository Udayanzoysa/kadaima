import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

/** Digits only, with country code — e.g. 94771234567 (no + or spaces). */
function resolveWhatsappNumber() {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "";
  return raw.replace(/[^\d]/g, "");
}

const whatsappNumber = resolveWhatsappNumber();

export const APP_CONFIG = {
  name: "Kadaima",
  version: packageJson.version,
  copyright: `© ${currentYear}, Kadaima.`,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5425",
  /** Linked WhatsApp bot number for public "Chat on WhatsApp" deep links. */
  whatsappNumber,
  whatsappUrl: whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi Kadaima Expert!")}`
    : null,
  meta: {
    title: "Kadaima LMS | Online Classes, Quizzes & Past Papers Sri Lanka",
    description:
      "Sri Lanka’s online LMS, tuition classes, and exam quiz portal for Grade 5 Scholarship, G.C.E. O/L, and A/L students. Practice past papers and track progress.",
  },
};
