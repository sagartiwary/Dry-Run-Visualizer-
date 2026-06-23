/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development output separate from production builds. Mixing both in
  // one .next directory can leave stale manifests and cause internal errors.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
