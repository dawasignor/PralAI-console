import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Serve the Netlify function during `npm run dev`.
 *
 * In production Netlify rewrites /api/* onto netlify/functions (see
 * netlify.toml). Locally there is no Netlify runtime, so this plugin mounts the
 * very same module on the same path. One command to run the console, and dev
 * exercises the deployed code rather than a second mock.
 */
function netlifyFunctionsDev(): Plugin {
  return {
    name: "netlify-functions-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        const name = url.replace("/api/", "").split("?")[0];
        try {
          // ssrLoadModule compiles the TypeScript function on the fly.
          const mod = await server.ssrLoadModule(
            `/netlify/functions/${name}.ts`,
          );

          // Re-assemble the raw request as a web Request, which is what a
          // Netlify v2 function receives.
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(`http://localhost${url}`, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });

          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), netlifyFunctionsDev()],
  server: { port: 5173 },
  build: { outDir: "dist", sourcemap: true },
});
