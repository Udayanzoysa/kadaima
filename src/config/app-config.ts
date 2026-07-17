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
    title: "Kadaima | Sri Lanka’s Leading Online Exam & Quiz Portal",
    description:
      "Master your exams with Kadaima. Access a wide range of online practice tests, quizzes, and assessments tailored for Sri Lankan students. Start learning today!",
  },
};
