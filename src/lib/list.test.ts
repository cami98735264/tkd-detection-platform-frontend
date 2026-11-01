import { describe, expect, it } from "vitest";

import { asList, toQuery } from "./list";

describe("asList", () => {
  it("accepts bare arrays and paginated bodies", () => {
    expect(asList<number>([1, 2])).toEqual([1, 2]);
    expect(asList<number>({ count: 1, next: null, previous: null, results: [3] })).toEqual([3]);
  });

  it("falls back to an empty list for unexpected shapes", () => {
    expect(asList(null)).toEqual([]);
    expect(asList({ id: 1 })).toEqual([]);
    expect(asList("x")).toEqual([]);
  });
});

describe("toQuery", () => {
  it("skips empty values", () => {
    expect(toQuery({ a: 1, b: "", c: undefined, d: null, e: true })).toBe("?a=1&e=true");
    expect(toQuery({})).toBe("");
  });
});
