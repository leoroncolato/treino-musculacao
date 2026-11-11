import { test, expect } from "@playwright/test";

test("new set counts, local video play/pause, one active video and offline ranges", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: /Ter Quadríceps/ }).click();
  await expect(page.locator(".exercise-card")).toHaveCount(5);
  await expect(
    page.locator(".exercise-card").first().locator(".prescription b").first(),
  ).toHaveText("3");
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await expect(page.locator(".set-row")).toHaveCount(17);
  const smith = page.locator('[data-media-id="smith"]');
  const calf = page.locator('[data-media-id="seatedcalf"]');
  await expect(smith.locator("video")).not.toHaveAttribute("src");
  await expect(page.locator("iframe")).toHaveCount(0);
  await smith.getByRole("button", { name: "Ver vídeo de execução" }).click();
  await expect
    .poll(() =>
      smith.locator("video").evaluate((e: HTMLVideoElement) => e.currentTime),
    )
    .toBeGreaterThan(0);
  await calf.getByRole("button", { name: "Ver vídeo de execução" }).click();
  await expect
    .poll(() =>
      calf.locator("video").evaluate((e: HTMLVideoElement) => e.paused),
    )
    .toBe(false);
  expect(
    await smith.locator("video").evaluate((e: HTMLVideoElement) => e.paused),
  ).toBe(true);
  await calf.getByRole("button", { name: "Pausar vídeo" }).click();
  expect(
    await calf.locator("video").evaluate((e: HTMLVideoElement) => e.paused),
  ).toBe(true);
  await context.setOffline(true);
  const range = await page.evaluate(async () => {
    const r = await fetch("/media/exercises/smith-v1.mp4", {
      headers: { Range: "bytes=0-99" },
    });
    return {
      status: r.status,
      length: (await r.arrayBuffer()).byteLength,
      range: r.headers.get("Content-Range"),
    };
  });
  expect(range).toMatchObject({ status: 206, length: 100 });
  expect(range.range).toMatch(/^bytes 0-99\/\d+$/);
  await page.reload();
  await page.getByRole("button", { name: /Ter Quadríceps/ }).click();
  await smith.getByRole("button", { name: "Ver vídeo de execução" }).click();
  await expect
    .poll(() =>
      smith.locator("video").evaluate((e: HTMLVideoElement) => e.currentTime),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: /Qua Superior A/ }).click();
  await page.locator('[data-media-id="pronated"]').getByRole("button").click();
  await expect(
    page.getByText("Este vídeo precisa de internet.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test.describe("on-demand media with reduced motion and failures", () => {
  test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
  test("does not autoplay, stops the previous embed and offers a missing-file fallback", async ({
    page,
  }) => {
    await page.route("https://player.vimeo.com/video/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Player de teste</title><p>Player carregado sob demanda</p>",
      }),
    );
    await page.route("**/media/exercises/seatedcalf-v1.mp4", (route) =>
      route.abort(),
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Qua Superior A/ }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
    const pronated = page.locator('[data-media-id="pronated"]');
    const lateral = page.locator('[data-media-id="seatedlateral"]');
    await pronated.getByRole("button").click();
    await expect(pronated.locator("iframe")).toHaveAttribute(
      "src",
      /autoplay=0/,
    );
    await lateral.getByRole("button").click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(pronated.locator("iframe")).toHaveCount(0);
    await lateral.getByRole("button", { name: "Fechar vídeo" }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
    const shoulder = page.locator('[data-media-id="shoulder"]');
    await shoulder.getByRole("button").click();
    expect(
      await shoulder
        .locator("video")
        .evaluate((e: HTMLVideoElement) => e.paused),
    ).toBe(true);
    expect(
      await shoulder
        .locator("video")
        .evaluate((e: HTMLVideoElement) => e.muted && e.playsInline),
    ).toBe(true);
    await page.getByRole("button", { name: /Ter Quadríceps/ }).click();
    const calf = page.locator('[data-media-id="seatedcalf"]');
    await calf.getByRole("button").click();
    // Reduced motion waits for an explicit play before loading the video body.
    await calf.locator("video").evaluate((e: HTMLVideoElement) => {
      void e.play().catch(() => {});
    });
    await expect(
      calf.getByText("Demonstração indisponível neste momento"),
    ).toBeVisible();
    await expect(
      calf.getByRole("link", { name: "Abrir na fonte" }),
    ).toHaveAttribute("href", /^https:/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      ),
    ).toBe("rgb(51, 29, 74)");
  });
});

test("imported historic sessions keep retired movements and the recorded number of sets", async ({
  page,
}) => {
  const sid = crypto.randomUUID(),
    now = new Date().toISOString();
  const base = {
    session_id: sid,
    date: "2026-11-10",
    day: 2,
    load: null,
    reps: null,
    rir: null,
    completed: false,
    note: "",
    duration: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    version: 0,
  };
  const records = [
    { ...base, id: sid, exercise: "__session", set_number: 0 },
    ...["press", "hack", "ext", "calf"].flatMap((exercise) =>
      [1, 2].map((set_number) => ({
        ...base,
        id: crypto.randomUUID(),
        exercise,
        set_number,
        load: 20,
      })),
    ),
  ];
  await page.goto("/");
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  await page
    .getByLabel("Importar backup")
    .setInputFiles({
      name: "previous-plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ format: "treino-bella-v1", records }),
      ),
    });
  await page.getByRole("button", { name: "Ver / editar registros" }).click();
  await expect(
    page.getByRole("heading", { name: "Hack squat • opcional" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Agachamento no Smith" }),
  ).toHaveCount(0);
  await expect(page.locator(".exercise-card")).toHaveCount(4);
  await expect(page.locator(".set-row")).toHaveCount(8);
  const load = page.getByRole("spinbutton", {
    name: "Hack squat • opcional série 2 carga",
    exact: true,
  });
  await load.fill("25");
  await page.reload();
  await page.getByRole("tab", { name: "Meu histórico" }).click();
  await page.getByRole("button", { name: "Ver / editar registros" }).click();
  await expect(load).toHaveValue("25");
  await expect(page.locator(".set-row")).toHaveCount(8);
});
