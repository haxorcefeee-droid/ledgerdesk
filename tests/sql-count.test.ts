import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asCount } from "../src/lib/sql-count.ts";

describe("asCount", () => {
  it("treats postgres string counts as numbers", () => {
    assert.equal(asCount({ n: "0" }), 0);
    assert.equal(asCount({ n: "3" }), 3);
    assert.equal(asCount({ n: 0 }), 0);
    assert.equal(asCount({ n: 4 }), 4);
    assert.equal(asCount(undefined), 0);
    assert.equal(asCount({ n: null }), 0);
  });
});
