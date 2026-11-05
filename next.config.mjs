/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // The PDF renderer runs as plain Node, and needs the fonts and logo shipped with the invoice routes.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/orders/[id]/invoice.pdf": ["./app/fonts/Inter-*.otf", "./public/logo.png"],
    "/t/[token]/invoice.pdf": ["./app/fonts/Inter-*.otf", "./public/logo.png"],
  },
};

export default nextConfig;
