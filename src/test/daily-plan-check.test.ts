import { describe, expect, it } from "vitest";

import { ORDERS } from "@/data/dispo-data";
import { checkDailyPlan, estimatedWorkMinutes, MAX_SHIFT_MINUTES } from "@/lib/daily-plan-check";

function check(overrides: Partial<Parameters<typeof checkDailyPlan>[0]> = {}) {
  return checkDailyPlan({
    employeeName: "Alex",
    employeeAvailable: true,
    orders: [],
    travelMinutes: 15,
    ...overrides,
  });
}

describe("daily plan checks", () => {
  it("passes an available employee, sufficient material, mapped route, and a shift at the limit", () => {
    const order = { ...ORDERS[4]!, minutes: MAX_SHIFT_MINUTES };
    const results = check({ orders: [order] });

    expect(results.map((result) => result.status)).toEqual(["pass", "pass", "pass", "pass"]);
  });

  it("reports employee unavailability and a missing employee name", () => {
    expect(check({ employeeAvailable: false })[0]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("nicht verfügbar"),
    });
    expect(check({ employeeName: "" })[0]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("Kein Mitarbeiter eingetragen"),
    });
    expect(check()[2]).toMatchObject({
      status: "pending",
      message: expect.stringContaining("Noch keine Aufträge geplant"),
    });
  });

  it("describes material shortages and missing map coordinates", () => {
    const unmapped = { ...ORDERS[0]!, id: "missing-map-point" };
    const results = check({ orders: [ORDERS[0]!, ORDERS[6]!, unmapped] });

    expect(results[1]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("Stück fehlen"),
    });
    expect(results[2]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("missing-map-point"),
    });
    expect(check({ orders: [ORDERS[0]!] })[2]).toMatchObject({
      status: "warning",
      message: expect.stringContaining("ungefähre Ortsmitten-Koordinaten"),
    });
  });

  it("allows exactly nine hours and fails when the estimated shift exceeds it", () => {
    const oneStop = { ...ORDERS[4]!, minutes: MAX_SHIFT_MINUTES };
    const twoStops = [
      { ...ORDERS[4]!, minutes: 525 },
      { ...ORDERS[4]!, minutes: 1 },
    ];

    expect(estimatedWorkMinutes([oneStop], 15)).toBe(MAX_SHIFT_MINUTES);
    expect(check({ orders: [oneStop] })[3].status).toBe("pass");
    expect(check({ orders: twoStops })[3]).toMatchObject({
      status: "fail",
      message: expect.stringContaining("überschritten"),
    });
  });
});
