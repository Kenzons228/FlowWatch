import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    // Allow tunneling the dev server (e.g. a Cloudflare Quick Tunnel) for
    // demos — Vite blocks unrecognized Host headers by default.
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": "http://localhost:8787",
      "/uploads": "http://localhost:8787",
    },
  },
});
