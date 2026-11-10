import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the website forwards /waitlist and /events to the API on port 8787.
// That way the browser only talks to one address and we skip CORS headaches.
// API_PORT lets a second copy of the app (another worktree) run beside the first. Default 8787.
const api = `http://localhost:${(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.API_PORT ?? 8787}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/waitlist": api,
      "/events": api,
      "/checkout": api,
      "/me": api,
      "/profile": api,
      "/resume": api,
      "/billing-portal": api,
      "/admin": api,
    },
  },
});
