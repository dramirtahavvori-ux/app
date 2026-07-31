import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || ""),
    __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY || "")
  }
});
