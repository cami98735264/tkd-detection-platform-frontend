import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ageFromDateOnly, formatDateOnly, parseDateOnly, toDateOnly } from "./dateOnly";

const ORIGINAL_TZ = process.env.TZ;

describe.each(["America/Bogota", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"])(
  "date-only helpers in TZ=%s",
  (tz) => {
    beforeAll(() => {
      process.env.TZ = tz;
    });
    afterAll(() => {
      process.env.TZ = ORIGINAL_TZ;
    });

    it("applies the timezone under test", () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(tz === "UTC" ? "UTC" : tz);
    });

    it("keeps the local calendar day when serialising a Date (toDateOnly)", () => {
      // 20:30 local time: toISOString() would already be the next day west of UTC
      expect(toDateOnly(new Date(2026, 10, 19, 20, 30))).toBe("2026-11-19");
      // local midnight on the 1st: toISOString() would be the previous month east of UTC
      expect(toDateOnly(new Date(2026, 10, 1))).toBe("2026-11-01");
      expect(toDateOnly(new Date(2026, 11, 0))).toBe("2026-11-30");
      expect(toDateOnly(parseDateOnly("2024-02-29") as Date)).toBe("2024-02-29");
    });

    it("formats the received calendar day as dd/mm/aaaa", () => {
      expect(formatDateOnly("2026-10-31")).toBe("31/10/2026");
      expect(formatDateOnly("2026-01-01")).toBe("01/01/2026");
      expect(formatDateOnly("2024-02-29")).toBe("29/02/2024");
    });

    it("parses as a local date without shifting the day", () => {
      const d = parseDateOnly("2026-10-31");
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(9);
      expect(d?.getDate()).toBe(31);
    });

    it("computes age on the birthday boundary", () => {
      expect(ageFromDateOnly("2008-10-31", new Date(2026, 9, 30))).toBe(17);
      expect(ageFromDateOnly("2008-10-31", new Date(2026, 9, 31))).toBe(18);
    });
  },
);

describe("formatDateOnly edge cases", () => {
  it("returns the fallback for empty or malformed values", () => {
    expect(formatDateOnly(null)).toBe("—");
    expect(formatDateOnly(undefined)).toBe("—");
    expect(formatDateOnly("")).toBe("—");
    expect(formatDateOnly("31/10/2026")).toBe("—");
    expect(formatDateOnly("2026-10-31T05:00:00Z")).toBe("—");
    expect(formatDateOnly("2026-02-31")).toBe("—");
    expect(formatDateOnly("nope", "")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(formatDateOnly(" 2026-10-31 ")).toBe("31/10/2026");
  });

  it("returns null age for invalid birth dates", () => {
    expect(ageFromDateOnly("")).toBeNull();
    expect(ageFromDateOnly("not-a-date")).toBeNull();
  });
});
