#!/usr/bin/env bun

import {
  createTrace,
  appendTrace,
  computeRangePositions,
  tryReadFile,
  type ContributorType,
  type FileEdit,
} from "./trace-store";

interface HookInput {
  hook_event_name: string;
  model?: string;
  transcript_path?: string | null;
  conversation_id?: string;
  generation_id?: string;
  session_id?: string;
  file_path?: string;
  edits?: FileEdit[];
  command?: string;
  duration?: number;
  output?: string;
  is_background_agent?: boolean;
  composer_mode?: string;
  reason?: string;
  duration_ms?: number;
  tool_name?: string;
  tool_input?: { file_path?: string; new_string?: string; old_string?: string; command?: string };
  tool_use_id?: string;
  source?: string;
  cwd?: string;
}

const handlers: Record<string, (input: HookInput) => void> = {
  afterFileEdit: (input) => {
    const rangePositions = computeRangePositions(input.edits ?? [], tryReadFile(input.file_path!));
    appendTrace(createTrace("ai", input.file_path!, {
      model: input.model,
      rangePositions,
      transcript: input.transcript_path,
      metadata: { conversation_id: input.conversation_id, generation_id: input.generation_id },
    }));
  },

  afterTabFileEdit: (input) => {
    const rangePositions = computeRangePositions(input.edits ?? []);
    appendTrace(createTrace("ai", input.file_path!, {
      model: input.model,
      rangePositions,
      metadata: { conversation_id: input.conversation_id, generation_id: input.generation_id },
    }));
  },

  afterShellExecution: (input) => {
    appendTrace(createTrace("ai", ".shell-history", {
      model: input.model,
      transcript: input.transcript_path,
      metadata: {
        conversation_id: input.conversation_id,
        generation_id: input.generation_id,
        command: input.command,
        duration_ms: input.duration,
      },
    }));
  },

  sessionStart: (input) => {
    appendTrace(createTrace("ai", ".sessions", {
      model: input.model,
      metadata: {
        event: "session_start",
        session_id: input.session_id,
        conversation_id: input.conversation_id,
        is_background_agent: input.is_background_agent,
        composer_mode: input.composer_mode,
      },
    }));
  },

  sessionEnd: (input) => {
    appendTrace(createTrace("ai", ".sessions", {
      model: input.model,
      metadata: {
        event: "session_end",
        session_id: input.session_id,
        conversation_id: input.conversation_id,
        reason: input.reason,
        duration_ms: input.duration_ms,
      },
    }));
  },

  PostToolUse: (input) => {
    const toolName = input.tool_name ?? "";
    const isFileEdit = toolName === "Write" || toolName === "Edit";
    const isBash = toolName === "Bash";

    if (!isFileEdit && !isBash) return;

    const file = isBash ? ".shell-history" : input.tool_input?.file_path ?? ".unknown";

    const rangePositions = isFileEdit && input.tool_input?.new_string
      ? computeRangePositions(
          [{ old_string: input.tool_input.old_string ?? "", new_string: input.tool_input.new_string }],
          tryReadFile(input.tool_input.file_path!)
        )
      : undefined;

    appendTrace(createTrace("ai", file, {
      model: input.model,
      rangePositions,
      transcript: input.transcript_path,
      metadata: {
        session_id: input.session_id,
        tool_name: toolName,
        tool_use_id: input.tool_use_id,
        command: isBash ? input.tool_input?.command : undefined,
      },
    }));
  },

  SessionStart: (input) => {
    appendTrace(createTrace("ai", ".sessions", {
      model: input.model,
      metadata: { event: "session_start", session_id: input.session_id, source: input.source },
    }));
  },

  SessionEnd: (input) => {
    appendTrace(createTrace("ai", ".sessions", {
      model: input.model,
      metadata: { event: "session_end", session_id: input.session_id, reason: input.reason },
    }));
  },
};

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }

  const json = Buffer.concat(chunks).toString("utf-8").trim();
  if (!json) process.exit(0);

  try {
    const input = JSON.parse(json) as HookInput;
    handlers[input.hook_event_name]?.(input);
  } catch (e) {
    console.error("Hook error:", e);
    process.exit(1);
  }
}

main();
