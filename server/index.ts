// Temporary server for Vite development
import { createServer } from "vite";
import path from "path";

async function main() {
  const server = await createServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    root: "./client",
    server: {
      port: 5000,
      host: "0.0.0.0",
    },
  });

  await server.listen();
  console.log("Frontend-only Vite server running on http://localhost:5000");
}

main().catch(console.error);