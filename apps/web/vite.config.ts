import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the website forwards /waitlist and /events to the API on port 8787.
// That way the browser only talks to one address and we skip CORS headaches.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/waitlist": "http://localhost:8787",
      "/events": "http://localhost:8787",
    },
  },
});
