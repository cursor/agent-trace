import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const SCHEMA_BASE_URL = "https://agent-trace.dev/schemas/v1";

export const ContributorTypeSchema = z.enum([
  "human",
  "ai",
  "mixed",
  "unknown",
]);

export const ToolSchema = z.object({
  name: z.string().describe("Name of the tool that produced the code"),
  version: z.string().describe("Version of the tool"),
});

export const ContributorSchema = z.object({
  type: ContributorTypeSchema.describe("The type of contributor"),
  model_id: z
    .string()
    .max(250)
    .optional()
    .describe(
      "The model's unique identifier following models.dev convention (e.g., 'anthropic/claude-opus-4-5-20251101')"
    ),
});

export const RelatedResourceSchema = z.object({
  type: z.string().describe("Type of related resource"),
  url: z.string().url().describe("URL to the related resource"),
});

export const RangeSchema = z.object({
  start_line: z.number().int().min(1).describe("1-indexed start line number"),
  end_line: z.number().int().min(1).describe("1-indexed end line number"),
  content_hash: z
    .string()
    .optional()
    .describe(
      "Hash of attributed content for position-independent tracking"
    ),
  contributor: ContributorSchema.optional().describe(
    "Override contributor for this specific range (e.g., for agent handoffs)"
  ),
});

export const ConversationSchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .describe("URL to look up the conversation that produced this code"),
  contributor: ContributorSchema.optional().describe(
    "The contributor for ranges in this conversation (can be overridden per-range)"
  ),
  ranges: z
    .array(RangeSchema)
    .describe("Array of line ranges produced by this conversation"),
  related: z
    .array(RelatedResourceSchema)
    .optional()
    .describe("Other related resources"),
});

export const FileSchema = z.object({
  path: z.string().describe("Relative file path from repository root"),
  conversations: z
    .array(ConversationSchema)
    .describe("Array of conversations that contributed to this file"),
});

export const VcsTypeSchema = z.enum(["git", "jj", "hg", "svn"]);

export const VcsSchema = z.object({
  type: VcsTypeSchema.describe(
    "Version control system type (e.g., 'git', 'jj', 'hg')"
  ),
  revision: z
    .string()
    .describe(
      "Revision identifier (e.g., git commit SHA, jj change ID, hg changeset)"
    ),
});

export const TraceRecordSchema = z.object({
  version: z
    .string()
    .regex(/^[0-9]+\\.[0-9]+\\.[0-9]+$/)
    .describe("Agent Trace specification version (e.g., '1.0')"),
  id: z.string().uuid().describe("Unique identifier for this trace record"),
  timestamp: z
    .string()
    .datetime()
    .describe("RFC 3339 timestamp when trace was recorded"),
  vcs: VcsSchema.optional().describe(
    "Version control system information for this trace"
  ),
  tool: ToolSchema.optional().describe("The tool that generated this trace"),
  files: z
    .array(FileSchema)
    .describe("Array of files with attributed ranges"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Additional metadata for implementation-specific or vendor-specific data"
    ),
});

export function generateJsonSchemas(): Record<string, object> {
  const schemas: Record<string, object> = {};

  // Trace Record Schema
  schemas["trace-record.json"] = {
    ...zodToJsonSchema(TraceRecordSchema, {
      name: "TraceRecord",
      $refStrategy: "none",
    }),
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${SCHEMA_BASE_URL}/trace-record.json`,
    title: "Agent Trace Record",
  };

  return schemas;
}

export type ContributorType = z.infer<typeof ContributorTypeSchema>;
export type VcsType = z.infer<typeof VcsTypeSchema>;
export type Vcs = z.infer<typeof VcsSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Contributor = z.infer<typeof ContributorSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type File = z.infer<typeof FileSchema>;
export type RelatedResource = z.infer<typeof RelatedResourceSchema>;
export type TraceRecord = z.infer<typeof TraceRecordSchema>;
