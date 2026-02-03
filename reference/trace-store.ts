import { execFileSync } from "child_process";
import { existsSync, mkdirSync, appendFileSync, readFileSync, openSync, fstatSync, readSync, closeSync } from "fs";
import { join, relative } from "path";

export interface Range {
  start_line: number;
  end_line: number;
  content_hash?: string;
  contributor?: {
    type: "human" | "ai" | "mixed" | "unknown";
    model_id?: string;
  };
}

export interface Conversation {
  url?: string;
  contributor?: {
    type: "human" | "ai" | "mixed" | "unknown";
    model_id?: string;
  };
  ranges: Range[];
  related?: { type: string; url: string }[];
}

export interface FileEntry {
  path: string;
  conversations: Conversation[];
}

export type VcsType = "git" | "jj" | "hg" | "svn";

export interface Vcs {
  type: VcsType;
  revision: string;
}

export interface TraceRecord {
  version: string;
  id: string;
  timestamp: string;
  vcs?: Vcs;
  tool?: { name: string; version?: string };
  files: FileEntry[];
  metadata?: Record<string, unknown>;
}

export interface FileEdit {
  old_string: string;
  new_string: string;
  range?: { start_line_number: number; end_line_number: number; start_column: number; end_column: number };
}

const TRACE_PATH = ".agent-trace/traces.jsonl";

export function getWorkspaceRoot(): string {
  return process.env.CURSOR_PROJECT_DIR
    ?? process.env.CLAUDE_PROJECT_DIR
    ?? execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" }).trim()
    ?? process.cwd();
}

export function getToolInfo(): { name: string; version?: string } {
  if (process.env.CURSOR_VERSION) return { name: "cursor", version: process.env.CURSOR_VERSION };
  if (process.env.CLAUDE_PROJECT_DIR) return { name: "claude-code" };
  return { name: "unknown" };
}

export function getVcsInfo(cwd: string): Vcs | undefined {
  try {
    const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf-8" }).trim();
    return { type: "git", revision };
  } catch {
    return undefined;
  }
}

export function toRelativePath(absolutePath: string, root: string): string {
  return absolutePath.startsWith(root) ? relative(root, absolutePath) : absolutePath;
}

export function normalizeModelId(model?: string): string | undefined {
  if (!model) return undefined;
  if (model.includes("/")) return model;
  const prefixes: Record<string, string> = {
    "claude-": "anthropic",
    "gpt-": "openai",
    "o1": "openai",
    "o3": "openai",
    "gemini-": "google",
  };
  for (const [prefix, provider] of Object.entries(prefixes)) {
    if (model.startsWith(prefix)) return `${provider}/${model}`;
  }
  return model;
}

/**
 * Extracts the model identifier from a Claude Code transcript file.
 *
 * Claude Code stores conversation transcripts as JSONL files where each line
 * represents a message exchange. The model identifier is stored at `entry.message.model`.
 * This function reads only the tail of the file to efficiently get the most recent model,
 * which handles cases where the model may have changed during a session.
 *
 * @param transcriptPath - Absolute path to the Claude Code transcript JSONL file
 * @returns The model identifier (e.g., "claude-opus-4-5-20251101") or undefined if not found
 *
 * @example
 * ```typescript
 * const model = extractModelFromTranscript("/path/to/transcript.jsonl");
 * // Returns: "claude-opus-4-5-20251101"
 * ```
 */
export function extractModelFromTranscript(transcriptPath: string): string | undefined {
  try {
    const fd = openSync(transcriptPath, "r");
    const stats = fstatSync(fd);

    // Start with 4KB, expand if needed (balances syscall overhead vs read size)
    let readSize = Math.min(stats.size, 4 * 1024);

    while (readSize <= stats.size) {
      const buffer = Buffer.alloc(readSize);
      readSync(fd, buffer, 0, readSize, stats.size - readSize);

      const content = buffer.toString("utf-8");
      const lines = content.split("\n");

      // Iterate from end to get the most recent model
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const entry = JSON.parse(line);
          if (entry.message?.model) {
            closeSync(fd);
            return entry.message.model;
          }
        } catch {
          // Skip malformed/partial JSON lines
          continue;
        }
      }

      // No model found, try larger chunk
      if (readSize >= stats.size) break;
      readSize = Math.min(stats.size, readSize * 2);
    }

    closeSync(fd);
    return undefined;
  } catch {
    // File doesn't exist or isn't readable
    return undefined;
  }
}

export interface RangePosition {
  start_line: number;
  end_line: number;
}

/**
 * Computes which lines in `newStr` are actually new or modified compared to `oldStr`.
 *
 * This function performs a simple line-by-line diff to distinguish between:
 * - Context lines: Lines that exist in both old and new strings (not attributed)
 * - Changed lines: Lines that are new or modified (attributed to AI)
 *
 * This is necessary because some tools (like Claude Code's Edit tool) include
 * surrounding context lines in both `old_string` and `new_string`. Without this
 * diff, we would incorrectly attribute unchanged context lines to the AI.
 *
 * @param oldStr - The original string before the edit
 * @param newStr - The new string after the edit
 * @returns Array of 0-indexed line offsets within `newStr` that are new or modified
 *
 * @example
 * ```typescript
 * // old: "line1\nline2\nline3"
 * // new: "line1\nNEW LINE\nline3"
 * diffToFindChangedLines(old, new); // Returns [1] - only the middle line changed
 * ```
 */
function diffToFindChangedLines(oldStr: string, newStr: string): number[] {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const changedOffsets: number[] = [];

  let oldIdx = 0;

  for (let newIdx = 0; newIdx < newLines.length; newIdx++) {
    if (oldIdx < oldLines.length && oldLines[oldIdx] === newLines[newIdx]) {
      // Matching line - this is context, not a change
      oldIdx++;
    } else {
      // Check if this line from newStr exists later in oldStr (handles deletions)
      let foundAhead = false;
      for (let lookAhead = oldIdx; lookAhead < oldLines.length; lookAhead++) {
        if (oldLines[lookAhead] === newLines[newIdx]) {
          oldIdx = lookAhead + 1;
          foundAhead = true;
          break;
        }
      }

      if (!foundAhead) {
        // Line is genuinely new or modified - attribute to AI
        changedOffsets.push(newIdx);
      }
    }
  }

  return changedOffsets;
}

export function computeRangePositions(edits: FileEdit[], fileContent?: string): RangePosition[] {
  return edits
    .filter((e) => e.new_string)
    .flatMap((edit) => {
      // Case 1: Has explicit range from tool → use it
      if (edit.range) {
        return [{
          start_line: edit.range.start_line_number,
          end_line: edit.range.end_line_number,
        }];
      }

      // Case 2: Has both old_string and new_string → diff them to find actual changes
      if (edit.old_string && edit.new_string && fileContent) {
        const idx = fileContent.indexOf(edit.new_string);
        if (idx !== -1) {
          const startLine = fileContent.substring(0, idx).split("\n").length;
          const changedOffsets = diffToFindChangedLines(edit.old_string, edit.new_string);

          if (changedOffsets.length === 0) {
            return [];
          }

          // Convert offsets to line ranges, merging adjacent lines
          const ranges: RangePosition[] = [];
          let rangeStart = changedOffsets[0];
          let rangeEnd = changedOffsets[0];

          for (let i = 1; i < changedOffsets.length; i++) {
            if (changedOffsets[i] === rangeEnd + 1) {
              rangeEnd = changedOffsets[i];
            } else {
              ranges.push({
                start_line: startLine + rangeStart,
                end_line: startLine + rangeEnd,
              });
              rangeStart = changedOffsets[i];
              rangeEnd = changedOffsets[i];
            }
          }

          ranges.push({
            start_line: startLine + rangeStart,
            end_line: startLine + rangeEnd,
          });

          return ranges;
        }
      }

      // Case 3: Fallback - attribute entire new_string (original behavior)
      const lineCount = edit.new_string.split("\n").length;
      if (fileContent) {
        const idx = fileContent.indexOf(edit.new_string);
        if (idx !== -1) {
          const startLine = fileContent.substring(0, idx).split("\n").length;
          return [{ start_line: startLine, end_line: startLine + lineCount - 1 }];
        }
      }
      return [{ start_line: 1, end_line: lineCount }];
    });
}

export type ContributorType = "human" | "ai" | "mixed" | "unknown";

export function createTrace(
  type: ContributorType,
  filePath: string,
  opts: {
    model?: string;
    rangePositions?: RangePosition[];
    transcript?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): TraceRecord {
  const root = getWorkspaceRoot();
  const modelId = normalizeModelId(opts.model);
  const conversationUrl = opts.transcript ? `file://${opts.transcript}` : undefined;

  const ranges: Range[] = opts.rangePositions?.length
    ? opts.rangePositions.map((pos) => ({ ...pos }))
    : [{ start_line: 1, end_line: 1 }];

  const conversation: Conversation = {
    url: conversationUrl,
    contributor: { type, model_id: modelId },
    ranges,
  };

  return {
    version: "1.0",
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    vcs: getVcsInfo(root),
    tool: getToolInfo(),
    files: [
      {
        path: toRelativePath(filePath, root),
        conversations: [conversation],
      },
    ],
    metadata: opts.metadata,
  };
}

export function appendTrace(trace: TraceRecord): void {
  const root = getWorkspaceRoot();
  const filePath = join(root, TRACE_PATH);
  const dir = join(root, ".agent-trace");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(filePath, JSON.stringify(trace) + "\n", "utf-8");
}

export function tryReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}
