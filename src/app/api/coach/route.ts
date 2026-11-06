import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AiNotConfiguredError, AiRefusalError, streamText, type Anthropic } from "@/lib/ai/client";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { loadLearnerMemory, memoryDigest } from "@/lib/learning/memory";

export const maxDuration = 120;

const Body = z.object({ message: z.string().trim().min(1).max(4000) });

/** Streams a coach reply as plain text (text/plain; chunked). */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid message.", { status: 400 });

  const { user, profile } = await requireProfile();
  const db = await createClient();

  const { data: history } = await db
    .from("coach_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const memory = await loadLearnerMemory(db, user.id, profile);

  const messages: Anthropic.MessageParam[] = [
    // Memory goes in the first user turn so the system prompt stays cacheable.
    { role: "user", content: `LEARNER MEMORY (for context; the learner cannot see this block)\n${memoryDigest(memory)}` },
    { role: "assistant", content: "Understood. I have your memory in mind. How can I help today?" },
    ...(history ?? []).reverse().map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: parsed.data.message },
  ];

  await db.from("coach_messages").insert({ user_id: user.id, role: "user", content: parsed.data.message });

  let stream: ReturnType<typeof streamText>;
  try {
    stream = streamText({ system: CHAT_SYSTEM, messages, effort: "low", maxTokens: 3000 });
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return new Response(e.message, { status: 503 });
    throw e;
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = "\n\n_(The coach declined to continue this particular request.)_";
          full += note;
          controller.enqueue(encoder.encode(note));
        }
      } catch (e) {
        const msg = e instanceof AiRefusalError ? e.message : "The coach ran into a problem. Please try again.";
        controller.enqueue(encoder.encode(`\n\n_${msg}_`));
      } finally {
        if (full.trim()) await db.from("coach_messages").insert({ user_id: user.id, role: "assistant", content: full });
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
