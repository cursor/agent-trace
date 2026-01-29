import { describe, expect, test } from "bun:test";
import { slugify } from "../lib/utils";

describe("slugify", () => {
  test("lowercases text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("UPPERCASE")).toBe("uppercase");
  });

  test("replaces spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
    expect(slugify("multiple   spaces")).toBe("multiple-spaces");
  });

  test("removes special characters", () => {
    expect(slugify("hello! world?")).toBe("hello-world");
    expect(slugify("test@#$%test")).toBe("testtest");
  });

  test("preserves hyphens and underscores", () => {
    expect(slugify("hello-world")).toBe("hello-world");
    expect(slugify("hello_world")).toBe("hello_world");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("hello---world")).toBe("hello-world");
    expect(slugify("a - - - b")).toBe("a-b");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  test("handles real heading examples", () => {
    expect(slugify("Agent Trace")).toBe("agent-trace");
    expect(slugify("Version Control System (VCS)")).toBe("version-control-system-vcs");
    expect(slugify("1. Introduction")).toBe("1-introduction");
  });
});
