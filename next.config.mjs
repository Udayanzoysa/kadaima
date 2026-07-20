/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: "standalone",
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    // lucide-react / date-fns / recharts are optimized by default; radix-ui is not.
    optimizePackageImports: ["radix-ui"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 blocks optimizing images from localhost/private IPs (SSRF guard).
    // Required while the Nest API serves /uploads on localhost during local dev.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "5425", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "5425", pathname: "/uploads/**" },
    ],
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
        source: "/auth/v1/forgot-password",
        destination: "/forgot-password",
        permanent: false,
      },
      {
        source: "/auth/v1/reset-password",
        destination: "/reset-password",
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
        source: "/forgot-password",
        destination: "/auth/v1/forgot-password",
      },
      {
        source: "/reset-password",
        destination: "/auth/v1/reset-password",
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
