import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getConfig } from "./config.js";

test("getConfig returns an empty config when no config file exists", () => {
  const home = mkdtempSync(join(tmpdir(), "gitcommitgen-test-"));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    assert.deepEqual(getConfig(), {});
  } finally {
    if (previous === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previous;
    }
    rmSync(home, { recursive: true, force: true });
  }
});
