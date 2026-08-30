import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMoney, parseMoney } from "../src/lib/money.ts";

describe("money", () => {
  it("parses dollars to cents", () => {
    assert.equal(parseMoney("12.50"), 1250);
    assert.equal(parseMoney("1,200"), 120000);
  });

  it("formats cents", () => {
    assert.equal(formatMoney(1250, "USD"), "$12.50");
  });
});
