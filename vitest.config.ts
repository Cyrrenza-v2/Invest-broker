import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { API_TOKEN: "unit-test-only-token" },
      },
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts"],
  },
});
