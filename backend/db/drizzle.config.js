import { defineConfig } from "drizzle-kit";
export default defineConfig({
    schema: "./src/schema/index.js",
    dialect: "sqlite",
    dbCredentials: {
        url: "file:../../sqlite.db",
    },
});
