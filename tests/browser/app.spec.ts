import { test, expect } from "@playwright/test";
test("public workout, private API, logging, timer, backups and offline reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Mais forte/ })).toBeVisible();
  expect((await page.request.get("/api/sync/records")).status()).toBe(401);
  await page.getByRole("button", { name: /Ter Quadríceps/ }).click();
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  const load = page.getByRole("spinbutton", {
    name: "Leg press 45° série 1 carga",
    exact: true,
  });
  await load.fill("35.5");
  await page
    .getByRole("spinbutton", {
      name: "Leg press 45° série 1 repetições",
      exact: true,
    })
    .fill("12");
  await page
    .getByRole("checkbox", {
      name: "Concluir Leg press 45° série 1",
      exact: true,
    })
    .check();
  await page.locator("summary").first().click();
  await expect(
    page
      .locator(".exercise-card")
      .first()
      .getByRole("button", { name: "Ver vídeo de execução" }),
  ).toBeVisible();
  await expect(page.locator(".session-progress")).toContainText("1/17 séries");
  await page
    .getByRole("button", { name: "Iniciar descanso", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Pausar descanso" }).click();
  await expect(page.getByRole("timer")).not.toHaveText("01:30");
  await page.getByRole("button", { name: "Reiniciar descanso" }).click();
  await expect(page.getByRole("timer")).toHaveText("01:30");
  await page.getByRole("button", { name: "Adicionar 15 segundos" }).click();
  await expect(page.getByRole("timer")).toHaveText("01:45");
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).toBeTruthy();
  await page.getByLabel("Importar backup").setInputFiles(file!);
  await expect(
    page.getByRole("status").filter({ hasText: "Backup lido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver / editar registros" }).click();
  await expect(load).toHaveValue("35.5");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Mais forte/ })).toBeVisible();
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  await page.getByRole("button", { name: "Ver / editar registros" }).click();
  await expect(load).toHaveValue("35.5");
  await load.fill("40");
  await page.reload();
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  await page.getByRole("button", { name: "Ver / editar registros" }).click();
  await expect(load).toHaveValue("40");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Sincronizar", exact: true }).click();
  await expect(page.getByText("Entre para sincronizar")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/${test.info().project.name}.png`,
    fullPage: true,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Excluir sessão", exact: true })
    .click();
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  await expect(
    page.getByText("Seu próximo treino começa a sua história."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

// The identity is supplied by this test harness only. Production always calls identity().
// Both browsers call the actual sync handler backed by an isolated real D1 simulation.
test("two independent browsers synchronize through D1 and resolve conflicts and deletion", async ({
  browser,
}) => {
  const { Miniflare } = await import("miniflare");
  const { readFileSync } = await import("node:fs");
  const { sync } = await import("../../worker/index");
  const mf = new Miniflare({
    enableDevRegistry: false,
    workers: [
      {
        config: {
          name: "browser-sync",
          compatibilityDate: "2026-11-04",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents: 'export default {fetch(){return new Response("ok")}}',
              },
            },
          },
          env: { DB: { type: "d1", id: "browser-db" } },
        },
      },
    ],
  });
  const db = await mf.getD1Database("DB");
  await db.exec(
    readFileSync("migrations/0001_records.sql", "utf8").replace(/\n/g, " "),
  );
  const contexts = await Promise.all([
    browser.newContext({ serviceWorkers: "block" }),
    browser.newContext({ serviceWorkers: "block" }),
  ]);
  try {
    for (const c of contexts)
      await c.route("**/api/sync/records*", async (route) => {
        const r = route.request();
        const request = new Request(r.url(), {
          method: r.method(),
          headers: r.headers(),
          body: r.method() === "POST" ? r.postData() : undefined,
        });
        const response = await sync(
          request,
          { DB: db } as unknown as import("../../worker/index").Env,
          "test-verified-user",
        );
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: await response.text(),
        });
      });
    const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
    await a.goto("http://localhost:4173");
    await a.getByRole("button", { name: /Ter Quadríceps/ }).click();
    await a.getByRole("button", { name: "Iniciar sessão" }).click();
    const load = (p: typeof a) =>
      p.getByRole("spinbutton", {
        name: "Leg press 45° série 1 carga",
        exact: true,
      });
    const syncPage = async (p: typeof a) => {
      await p.getByRole("button", { name: "Sincronizar", exact: true }).click();
      await expect(
        p.getByText("Tudo sincronizado", { exact: true }),
      ).toBeVisible();
    };
    await load(a).fill("20");
    await syncPage(a);
    await b.goto("http://localhost:4173");
    await syncPage(b);
    await b.getByRole("tab", { name: "Meu histórico" }).click();
    await b.getByRole("button", { name: "Ver / editar registros" }).click();
    await expect(load(b)).toHaveValue("20");
    await load(a).fill("30");
    await load(b).fill("40");
    await syncPage(a);
    await b.getByRole("button", { name: "Sincronizar", exact: true }).click();
    await expect(
      b.getByRole("heading", { name: "Revisar 1 divergência(s)" }),
    ).toBeVisible();
    await expect(load(b)).toHaveValue("40");
    await b.getByRole("button", { name: "Manter local" }).click();
    await syncPage(b);
    await syncPage(a);
    await expect(load(a)).toHaveValue("40");
    a.on("dialog", (d) => d.accept());
    await a
      .getByRole("button", { name: "Excluir sessão", exact: true })
      .click();
    await syncPage(a);
    await syncPage(b);
    await b.getByRole("tab", { name: "Meu histórico" }).click();
    await expect(
      b.getByText("Seu próximo treino começa a sua história."),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await mf.dispose();
  }
});
