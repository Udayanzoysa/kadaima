/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      // Old dashboard URLs → /admin
      {
        source: "/dashboard",
        destination: "/admin/default",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/admin/:path*",
        permanent: false,
      },
      // Public quiz catalog lives at home
      {
        source: "/quiz",
        destination: "/",
        permanent: false,
      },
      // Auth URL cleanup
      {
        source: "/auth/v1/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/auth/v1/register/student",
        destination: "/student/register",
        permanent: false,
      },
      {
        source: "/auth/v1/register/teacher",
        destination: "/teacher/register",
        permanent: false,
      },
      {
        source: "/auth/v1/register",
        destination: "/student/register",
        permanent: false,
      },
      {
        source: "/teacherregister",
        destination: "/teacher/register",
        permanent: false,
      },
      {
        source: "/teacherregister/",
        destination: "/teacher/register",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/login",
        destination: "/auth/v1/login",
      },
      {
        source: "/student/register",
        destination: "/auth/v1/register/student",
      },
      // Must be before /teacher/:path* so register is not treated as dashboard
      {
        source: "/teacher/register",
        destination: "/auth/v1/register/teacher",
      },
      {
        source: "/admin",
        destination: "/dashboard/default",
      },
      {
        source: "/admin/:path*",
        destination: "/dashboard/:path*",
      },
      {
        source: "/teacher",
        destination: "/dashboard/default",
      },
      {
        source: "/teacher/:path*",
        destination: "/dashboard/:path*",
      },
    ];
  },
};

export default nextConfig;
