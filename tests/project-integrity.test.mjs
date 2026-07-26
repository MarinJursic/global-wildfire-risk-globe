import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("README preserves scientific honesty and reproducible setup", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /not an[\s>]*operational/i);
  assert.match(readme, /npm run build/);
  assert.match(readme, /pytest/);
  assert.match(readme, /NASA FIRMS/);
  assert.match(readme, /ERA5-Land/);
  assert.match(readme, /architecture/i);
});

test("repository includes a real, reviewable continuous walkthrough", async () => {
  const [video, preview, poster] = await Promise.all([
    readFile(
      new URL(
        "../docs/walkthrough/app-walkthrough.mp4",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../docs/walkthrough/app-walkthrough.gif",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../docs/walkthrough/app-walkthrough-poster.jpg",
        import.meta.url,
      ),
    ),
  ]);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  assert.equal(preview.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.deepEqual([...poster.subarray(0, 3)], [0xff, 0xd8, 0xff]);

  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /\]\(docs\/walkthrough\/app-walkthrough\.mp4\)/);
  assert.match(readme, /one uninterrupted recording/i);
  assert.match(readme, /every state transition is rendered by the running application/i);
});

test("frontend and API agree on story event and horizons", async () => {
  const [contracts, dashboard, apiModels] = await Promise.all([
    readFile(new URL("../lib/contracts.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/WildfireDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/models.py", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /evros/i);
  for (const horizon of ["6h", "24h", "48h", "72h", "7d"]) {
    assert.ok(contracts.includes(`"${horizon}"`));
    assert.ok(apiModels.includes(`"${horizon}"`));
  }
});

test("globe uses published geographic boundaries and exposes a persistent theme", async () => {
  const [globe, dashboard, packageJson] = await Promise.all([
    readFile(new URL("../components/GlobeScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/WildfireDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(globe, /countries-110m\.json/);
  assert.match(globe, /Math\.abs\(lon - previousLon\) > 180/);
  assert.doesNotMatch(globe, /const continental/);
  assert.match(packageJson, /"world-atlas": "2\.0\.2"/);
  assert.match(dashboard, /ember-theme/);
  assert.match(dashboard, /Switch to.*theme/);
});
