import { describe, expect, test } from "bun:test";
import {
  normalizeModelId,
  computeRangePositions,
  toRelativePath,
  type FileEdit,
} from "../reference/trace-store";

describe("normalizeModelId", () => {
  test("returns undefined for undefined input", () => {
    expect(normalizeModelId(undefined)).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(normalizeModelId("")).toBeUndefined();
  });

  test("returns model unchanged if already has provider prefix", () => {
    expect(normalizeModelId("anthropic/claude-3-opus")).toBe(
      "anthropic/claude-3-opus"
    );
    expect(normalizeModelId("openai/gpt-4")).toBe("openai/gpt-4");
  });

  test("prefixes anthropic/ for claude models", () => {
    expect(normalizeModelId("claude-3-opus")).toBe("anthropic/claude-3-opus");
    expect(normalizeModelId("claude-opus-4-5-20251101")).toBe(
      "anthropic/claude-opus-4-5-20251101"
    );
  });

  test("prefixes openai/ for gpt models", () => {
    expect(normalizeModelId("gpt-4")).toBe("openai/gpt-4");
    expect(normalizeModelId("gpt-4-turbo")).toBe("openai/gpt-4-turbo");
  });

  test("prefixes openai/ for o1 and o3 models", () => {
    expect(normalizeModelId("o1")).toBe("openai/o1");
    expect(normalizeModelId("o1-preview")).toBe("openai/o1-preview");
    expect(normalizeModelId("o3")).toBe("openai/o3");
    expect(normalizeModelId("o3-mini")).toBe("openai/o3-mini");
  });

  test("prefixes google/ for gemini models", () => {
    expect(normalizeModelId("gemini-pro")).toBe("google/gemini-pro");
    expect(normalizeModelId("gemini-1.5-flash")).toBe("google/gemini-1.5-flash");
  });

  test("returns model unchanged for unknown prefixes", () => {
    expect(normalizeModelId("mistral-large")).toBe("mistral-large");
    expect(normalizeModelId("llama-3")).toBe("llama-3");
  });
});

describe("computeRangePositions", () => {
  test("returns empty array for empty edits", () => {
    expect(computeRangePositions([])).toEqual([]);
  });

  test("filters out edits with no new_string", () => {
    const edits: FileEdit[] = [
      { old_string: "foo", new_string: "" },
      { old_string: "bar", new_string: "" },
    ];
    expect(computeRangePositions(edits)).toEqual([]);
  });

  test("uses edit.range when provided", () => {
    const edits: FileEdit[] = [
      {
        old_string: "old",
        new_string: "new content\nline 2",
        range: {
          start_line_number: 10,
          end_line_number: 15,
          start_column: 1,
          end_column: 10,
        },
      },
    ];
    expect(computeRangePositions(edits)).toEqual([
      { start_line: 10, end_line: 15 },
    ]);
  });

  test("calculates line position from file content when available", () => {
    const fileContent = "line 1\nline 2\nnew content\nline 4";
    const edits: FileEdit[] = [{ old_string: "", new_string: "new content" }];

    const result = computeRangePositions(edits, fileContent);
    expect(result).toEqual([{ start_line: 3, end_line: 3 }]);
  });

  test("calculates correct end_line for multi-line insertions", () => {
    const fileContent = "line 1\nmulti\nline\ncontent\nline 5";
    const edits: FileEdit[] = [
      { old_string: "", new_string: "multi\nline\ncontent" },
    ];

    const result = computeRangePositions(edits, fileContent);
    expect(result).toEqual([{ start_line: 2, end_line: 4 }]);
  });

  test("falls back to line 1 when content not found in file", () => {
    const fileContent = "completely different content";
    const edits: FileEdit[] = [
      { old_string: "", new_string: "new\nstuff\nhere" },
    ];

    const result = computeRangePositions(edits, fileContent);
    expect(result).toEqual([{ start_line: 1, end_line: 3 }]);
  });

  test("falls back to line 1 when no file content provided", () => {
    const edits: FileEdit[] = [
      { old_string: "", new_string: "two\nlines" },
    ];

    const result = computeRangePositions(edits);
    expect(result).toEqual([{ start_line: 1, end_line: 2 }]);
  });

  test("handles multiple edits", () => {
    const edits: FileEdit[] = [
      {
        old_string: "",
        new_string: "first",
        range: { start_line_number: 1, end_line_number: 1, start_column: 1, end_column: 5 },
      },
      {
        old_string: "",
        new_string: "second\nthird",
        range: { start_line_number: 10, end_line_number: 11, start_column: 1, end_column: 5 },
      },
    ];

    const result = computeRangePositions(edits);
    expect(result).toEqual([
      { start_line: 1, end_line: 1 },
      { start_line: 10, end_line: 11 },
    ]);
  });
});

describe("toRelativePath", () => {
  test("converts absolute path within root to relative", () => {
    expect(toRelativePath("/home/user/project/src/file.ts", "/home/user/project")).toBe(
      "src/file.ts"
    );
  });

  test("handles root with trailing content correctly", () => {
    expect(toRelativePath("/home/user/project/deep/nested/file.ts", "/home/user/project")).toBe(
      "deep/nested/file.ts"
    );
  });

  test("returns path unchanged if not under root", () => {
    expect(toRelativePath("/other/path/file.ts", "/home/user/project")).toBe(
      "/other/path/file.ts"
    );
  });

  test("returns empty string for path equal to root", () => {
    expect(toRelativePath("/home/user/project", "/home/user/project")).toBe("");
  });
});
