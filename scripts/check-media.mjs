/* global document */
// document is used only in the Playwright browser callbacks below.
// Optional online review. Does not download or redistribute provider videos.
// Run against an already running local preview: node scripts/check-media.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { media } from "../src/data/media.ts";
import { workouts } from "../src/data/workout.ts";
const baseURL = process.env.BELLA_PREVIEW_URL || "http://localhost:4173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.HTTPS_PROXY
    ? {
        proxy: {
          server: process.env.HTTPS_PROXY,
          bypass: "localhost,127.0.0.1",
        },
      }
    : {}),
});
await mkdir("test-results/media-review", { recursive: true });
const queue = Object.entries(media).filter(([, m]) => m.type === "embed");
const results = [];
async function review() {
  for (;;) {
    const entry = queue.shift();
    if (!entry) return;
    const [id, item] = entry;
    const page = await browser.newPage({
      viewport: { width: 1100, height: 800 },
      serviceWorkers: "block",
    });
    try {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      const day = workouts.find((w) => w.exercises.some((e) => e.id === id));
      await page
        .locator(".days button")
        .nth(day.day - 1)
        .click();
      const card = page.locator(`[data-media-id="${id}"]`);
      await card.getByRole("button").click();
      await card.locator("iframe").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (videoId) =>
          [...document.querySelectorAll("iframe")].some((f) =>
            f.src.includes(videoId),
          ),
        item.videoId,
      );
      const frameElement = await card.locator("iframe").elementHandle();
      const frame = await frameElement.contentFrame();
      const play = frame
        .locator(
          'button[aria-label="Play"], button[title="Play"], button[data-play-button]',
        )
        .first();
      await play.click({ timeout: 20000 });
      await frame.waitForFunction(
        () => {
          const v = document.querySelector("video");
          return v && !v.paused && v.currentTime > 0.2;
        },
        undefined,
        { timeout: 20000 },
      );
      const playback = await frame.locator("video").evaluate((v) => ({
        currentTime: v.currentTime,
        width: v.videoWidth,
        height: v.videoHeight,
        duration: v.duration,
      }));
      await card.screenshot({ path: `test-results/media-review/${id}.png` });
      results.push({
        id,
        source: item.reference,
        result: "played",
        ...playback,
      });
      console.log(`${id}: played (${playback.width}×${playback.height})`);
    } catch (error) {
      results.push({
        id,
        source: item.reference,
        result: "failed",
        error: error.message.split("\n")[0],
      });
      console.log(`${id}: ${error.message.split("\n")[0]}`);
      await page.screenshot({
        path: `test-results/media-review/${id}-error.png`,
      });
    } finally {
      await page.close();
    }
  }
}
try {
  await Promise.all([review(), review()]);
} finally {
  await browser.close();
}
await writeFile(
  "test-results/media-review/results.json",
  JSON.stringify(results, null, 2),
);
if (results.some((r) => r.result !== "played")) process.exitCode = 1;
