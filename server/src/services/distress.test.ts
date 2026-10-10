import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDistressRules, clampDistress, filterWarningSigns } from "./distress.js";

describe("distress rules", () => {
  it("clamps out-of-range high", () => {
    assert.equal(clampDistress(150), 100);
  });
  it("clamps out-of-range low", () => {
    assert.equal(clampDistress(-20), 0);
  });
  it("caps +delta at 20", () => {
    const r = applyDistressRules({
      raw: 90,
      previous: 50,
      isOpening: false,
      initialDistress: 50,
    });
    assert.equal(r.clamped, 70);
    assert.equal(r.capped, true);
  });
  it("caps -delta at 20", () => {
    const r = applyDistressRules({
      raw: 10,
      previous: 50,
      isOpening: false,
      initialDistress: 50,
    });
    assert.equal(r.clamped, 30);
    assert.equal(r.capped, true);
  });
  it("allows change within ±20", () => {
    const r = applyDistressRules({
      raw: 62,
      previous: 50,
      isOpening: false,
      initialDistress: 50,
    });
    assert.equal(r.clamped, 62);
    assert.equal(r.capped, false);
  });
  it("opening uses initial when model is far off", () => {
    const r = applyDistressRules({
      raw: 10,
      previous: 65,
      isOpening: true,
      initialDistress: 65,
    });
    assert.equal(r.clamped, 65);
  });
  it("opening accepts model within ±10 of initial", () => {
    const r = applyDistressRules({
      raw: 70,
      previous: 65,
      isOpening: true,
      initialDistress: 65,
    });
    assert.equal(r.clamped, 70);
  });
  it("filters warning signs to allowed set", () => {
    assert.deepEqual(filterWarningSigns(["hopelessness", "xyz"], ["hopelessness"]), [
      "hopelessness",
    ]);
  });
});
