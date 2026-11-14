import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // The agent libraries are loaded by Node at runtime, not bundled: langsmith has an optional `ws` import the bundler cannot resolve.
  serverExternalPackages: ["deepagents", "langchain", "langsmith", "@langchain/core", "@langchain/openai", "openai", "@langchain/langgraph"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
