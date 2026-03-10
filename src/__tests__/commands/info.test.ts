import { describe, it, expect } from "vitest";
import { tokenStr } from "../../format.js";

describe("tokenStr", () => {
	it("should format large numbers as millions", () => {
		expect(tokenStr(2_000_000)).toBe("2.0M");
		expect(tokenStr(1_500_000)).toBe("1.5M");
	});

	it("should format medium numbers as thousands", () => {
		expect(tokenStr(100_000)).toBe("100K");
		expect(tokenStr(50_000)).toBe("50K");
	});

	it("should format small numbers as-is", () => {
		expect(tokenStr(999)).toBe("999");
		expect(tokenStr(500)).toBe("500");
		expect(tokenStr(1)).toBe("1");
	});

	it("should handle exact boundaries", () => {
		expect(tokenStr(1_000_000)).toBe("1.0M");
		expect(tokenStr(1000)).toBe("1K");
		expect(tokenStr(999_999)).toBe("1000K");
	});

	it("should format millions with 1 decimal place", () => {
		expect(tokenStr(1_234_567)).toBe("1.2M");
		expect(tokenStr(9_876_543)).toBe("9.9M");
	});

	it("should format thousands without decimal place", () => {
		expect(tokenStr(1_234)).toBe("1K");
		expect(tokenStr(9_876)).toBe("10K");
	});
});
