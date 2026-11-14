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
      { protocol: "https", hostname: "api.kadaima.com", pathname: "/uploads/**" },
      // New VPS (temporary HTTP until DNS/SSL for api.kadaima.com points here)
      { protocol: "http", hostname: "84.247.138.71", port: "4000", pathname: "/uploads/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
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
