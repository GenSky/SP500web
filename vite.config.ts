import { defineConfig } from "vite";

export default defineConfig({
  base: "/SP500web/",
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html",
        terminal: "terminal.html"
      }
    }
  }
});
