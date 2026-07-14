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
    ];
  },
  async rewrites() {
    return [
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
