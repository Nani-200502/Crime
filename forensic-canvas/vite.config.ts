import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = env.VITE_BACKEND_ORIGIN || "http://127.0.0.1:5000";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/auth": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/cases": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/sketch": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/refine": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/health": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
