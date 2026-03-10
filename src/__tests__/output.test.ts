import { afterEach, describe, expect, it } from "vitest";
import { treeJoin } from "../format.js";
import { boolValue, pc, setPlainMode } from "../output.js";

describe("plain output mode", () => {
	afterEach(() => {
		setPlainMode(false);
	});

	it("should disable ANSI color helpers in plain mode", () => {
		setPlainMode(true);
		expect(pc.gray("test")).toBe("test");
	});

	it("should use ASCII tree connectors in plain mode", () => {
		setPlainMode(true);
		expect(treeJoin("model", false)).toBe("|-- model");
		expect(treeJoin("model", true)).toBe("\\-- model");
	});

	it("should render boolean values as yes or no in plain mode", () => {
		setPlainMode(true);
		expect(boolValue(true)).toBe("yes");
		expect(boolValue(false)).toBe("no");
	});
});
