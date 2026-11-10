import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./worker/index.ts" with { type: "cf-worker" };
export default defineConfig(({ mode }) => {
  const live = mode === "live";
  const accessTeam =
    process.env.BELLA_ACCESS_TEAM || "withered-heart-8f5a.cloudflareaccess.com";
  if (live && (!process.env.BELLA_D1_ID || !process.env.BELLA_ACCESS_AUD))
    throw new Error(
      "Live requires BELLA_D1_ID and BELLA_ACCESS_AUD. See DEPLOY.md.",
    );
  return {
    worker: {
      name: live ? "treino-bella" : "treino-bella-local",
      compatibilityDate: "2026-11-04",
      entrypoint,
      assets: {
        notFoundHandling: "single-page-application",
        runWorkerFirst: ["/api/*"],
      },
      domains: live ? ["treino.leonardoroncolato.com.br"] : [],
      env: {
        ASSETS: bindings.assets(),
        DB: bindings.d1({
          name: live ? "treino-bella" : "treino-bella-local",
          id: live
            ? process.env.BELLA_D1_ID!
            : "11111111-1111-4111-8111-111111111111",
        }),
        ACCESS_TEAM_DOMAIN: bindings.text(live ? accessTeam : ""),
        ACCESS_AUD: bindings.text(live ? process.env.BELLA_ACCESS_AUD! : ""),
        ALLOWED_EMAIL: bindings.text("leonardo.p.froncolato@gmail.com"),
      },
    },
  };
});
