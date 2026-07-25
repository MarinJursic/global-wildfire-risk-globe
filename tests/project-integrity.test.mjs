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

test("repository includes a real, reviewable dashboard capture", async () => {
  const screenshot = await readFile(
    new URL("../public/ember-dashboard.png", import.meta.url),
  );
  assert.equal(screenshot.subarray(1, 4).toString("ascii"), "PNG");
  assert.ok(screenshot.readUInt32BE(16) >= 1200);
  assert.ok(screenshot.readUInt32BE(20) >= 630);

  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /!\[EMBER dashboard running locally\]\(public\/ember-dashboard\.png\)/);
  assert.match(readme, /not a design mockup/i);
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
