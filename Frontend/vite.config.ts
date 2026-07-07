import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // lovable-tagger is only used in local dev — skip it in CI / Docker builds
  const extraPlugins = [];
  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      extraPlugins.push(componentTagger());
    } catch {
      // not installed or not available — safe to skip
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), ...extraPlugins],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
