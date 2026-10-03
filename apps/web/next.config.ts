import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stipnd/protocol", "@stipnd/sdk"],
  reactStrictMode: true,
  typedRoutes: true,
  agentRules: false,
};

export default nextConfig;
