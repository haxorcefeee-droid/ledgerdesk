import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBusinessScopedIds, assertBusinessScopedRows } from "../src/lib/business-scope.ts";

describe("business-scoped accounting data", () => {
  it("rejects a customer from another business", () => {
    assert.throws(
      () =>
        assertBusinessScopedRows(
          5,
          [{ id: 21, business_id: 8 }],
          "customer",
        ),
      /customer.*business/i,
    );
  });

  it("rejects invoice income accounts from another business", () => {
    assert.throws(
      () =>
        assertBusinessScopedIds(
          2,
          [
            { id: 101, business_id: 2 },
            { id: 202, business_id: 9 },
          ],
          "invoice income account",
        ),
      /invoice income account.*business/i,
    );
  });
});
