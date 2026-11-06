import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const DEFAULT_EFFORT = ((process.env.ANTHROPIC_EFFORT as Effort | undefined) ?? "medium") satisfies Effort;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example).");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRefusalError extends Error {
  constructor(public readonly category: string | null, explanation?: string | null) {
    super(explanation ?? "The model declined this request.");
    this.name = "AiRefusalError";
  }
}

let cached: Anthropic | null = null;
export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiNotConfiguredError();
  if (!cached) cached = new Anthropic({ maxRetries: 2, timeout: 10 * 60 * 1000 });
  return cached;
}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface StructuredRequest<T extends z.ZodType> {
  system: string;
  user: string;
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}

/**
 * One structured-output request. Streams to avoid HTTP timeouts on long
 * generations, then returns the Zod-validated object.
 */
export async function generateStructured<T extends z.ZodType>({
  system,
  user,
  schema,
  effort = DEFAULT_EFFORT,
  maxTokens = 16000,
}: StructuredRequest<T>): Promise<z.infer<T>> {
  const client = getClient();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    // Stable system prompt first so it can be served from the prompt cache.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema), effort },
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new AiRefusalError(message.stop_details?.category ?? null, message.stop_details?.explanation);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("The model's response was cut off (max_tokens). Try again.");
  }
  const parsed = message.parsed_output;
  if (!parsed) {
    throw new Error("The model returned output that did not match the expected schema.");
  }
  return parsed;
}

/** Plain text streaming for the coach chat. Returns the SDK stream. */
export function streamText(params: {
  system: string;
  messages: Anthropic.MessageParam[];
  effort?: Effort;
  maxTokens?: number;
}) {
  const client = getClient();
  return client.messages.stream({
    model: MODEL,
    max_tokens: params.maxTokens ?? 4000,
    system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
    messages: params.messages,
    output_config: { effort: params.effort ?? "low" },
  });
}

export { Anthropic };
