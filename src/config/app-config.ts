import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Kadaima",
  version: packageJson.version,
  copyright: `© ${currentYear}, Kadaima.`,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5425",
  meta: {
    title: "Kadaima | Sri Lanka’s Leading Online Exam & Quiz Portal",
    description:
      "Master your exams with Kadaima. Access a wide range of online practice tests, quizzes, and assessments tailored for Sri Lankan students. Start learning today!",
  },
};
