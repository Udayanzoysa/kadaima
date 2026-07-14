import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Techwing LMS",
  version: packageJson.version,
  copyright: `© ${currentYear}, Techwing LMS.`,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5425",
  meta: {
    title: "Techwing LMS | Learning Management System Dashboard",
    description:
      "Manage students, teachers, and quizzes with Techwing LMS. A modern learning management system dashboard for educational institutions.",
  },
};
