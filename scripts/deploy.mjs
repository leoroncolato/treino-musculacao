import { spawnSync } from "node:child_process";
if (process.env.BELLA_DEPLOY_APPROVED !== "yes")
  throw new Error(
    "Publicação bloqueada: obtenha autorização expressa e siga DEPLOY.md.",
  );
for (const args of [
  ["cf", "build", "--mode", "live"],
  ["node", "scripts/service-worker.mjs"],
  ["cf", "deploy", "--mode", "live", "--prebuilt"],
]) {
  const [bin, ...rest] = args;
  const result = spawnSync(bin, rest, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
