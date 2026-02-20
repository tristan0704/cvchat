import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Workaround for Windows EPERM spawn during Next internal type-check step.
  // CI/local quality gate should run `npm run typecheck` explicitly.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
