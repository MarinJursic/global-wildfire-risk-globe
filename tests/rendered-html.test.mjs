import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the wildfire research product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /EMBER/);
  assert.match(html, /Global wildfire intelligence/);
  assert.match(html, /Ignition risk/);
  assert.match(html, /Alexandroupolis/);
  assert.match(html, /Replay fixture comparison/i);
  assert.match(html, /<title>EMBER \/ Global Wildfire Intelligence<\/title>/i);
  assert.doesNotMatch(html, /starter-preview|Your site is taking shape/);
});

test("removes disposable starter assets and includes scientific contracts", async () => {
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
  await assert.rejects(access(new URL("app/chatgpt-auth.ts", root)));
  await assert.rejects(access(new URL("examples/d1/app/api/notes/route.ts", root)));

  const [packageJson, story, contracts, dashboard] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("lib/story.ts", root), "utf8"),
    readFile(new URL("lib/contracts.ts", root), "utf8"),
    readFile(new URL("components/WildfireDashboard.tsx", root), "utf8"),
  ]);

  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(packageJson, /drizzle/);
  assert.match(packageJson, /"three"/);
  assert.match(story, /riskLow/);
  assert.match(story, /arrivalErrorMinutes/);
  assert.match(contracts, /probability/);
  assert.match(dashboard, /Illustrative risk interval/);
  assert.match(dashboard, /repeated 24-hour hazard fixture/i);
  assert.match(dashboard, /not a calibrated alert probability/i);
  assert.match(dashboard, /not mapped operational assets/i);
  for (const layer of ["temperature", "moisture", "scars", "infrastructure"]) {
    assert.match(dashboard, new RegExp(layer, "i"));
  }
});
