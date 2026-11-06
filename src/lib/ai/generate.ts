import "server-only";
import {
  GrammarContent,
  ReviewContent,
  TeachingContent,
  ToeflBuildSentenceContent,
  ToeflChooseResponseContent,
  ToeflCompleteWordsContent,
  ToeflPassageContent,
  ToeflSpeakingContent,
  ToeflWritingContent,
  VocabularyContent,
  type ExerciseContent,
} from "./schemas";
import { generateStructured } from "./client";
import { GENERATION_SYSTEM, toeflTaskBrief } from "./prompts";
import type { LearnerMemory } from "@/lib/learning/memory";
import { memoryDigest } from "@/lib/learning/memory";
import { TOEFL_TASKS, type ToeflTaskType } from "@/lib/learning/toefl-spec";
import type { PlanBlock } from "@/lib/learning/plan-types";
import { reviewPriority } from "@/lib/learning/srs";

function header(memory: LearnerMemory, block: PlanBlock) {
  return `LEARNER MEMORY\n${memoryDigest(memory)}\n\nTODAY'S BLOCK\nSkill: ${block.skill}\nTitle: ${block.title}\nFocus: ${block.focus}\nTime budget: ${block.estimated_minutes} minutes\nDate: ${new Date().toISOString().slice(0, 10)}`;
}

export async function generateVocabulary(memory: LearnerMemory, block: PlanBlock, request?: string) {
  return generateStructured({
    system: GENERATION_SYSTEM,
    schema: VocabularyContent,
    user: `${header(memory, block)}

Generate a vocabulary set of exactly 4 items around one coherent theme (vary themes across days: academic argument, professional email, literature, science, everyday idiom, teaching talk, media...). Mix types across the set: at least one collocation or idiomatic expression, at least one precise single word with a near-synonym contrast. All C1–C2, genuinely useful, not obscure. ${request ? `Learner request: ${request}` : ""}
If any active weakness is lexical (e.g. register, collocation), address it. "task" must ask for one original sentence per item that shows the meaning through context.`,
  });
}

export async function generateGrammar(memory: LearnerMemory, block: PlanBlock, request?: string) {
  return generateStructured({
    system: GENERATION_SYSTEM,
    schema: GrammarContent,
    user: `${header(memory, block)}

Choose ONE grammar/precision topic. Priority: (1) a recurring grammar weakness that is due or high-severity; (2) otherwise an advanced C1–C2 structure not yet covered (inversion, cleft sentences, nominalisation, hedging and modality, aspect nuances, participle clauses, discourse markers, subjunctive, fronting, ellipsis and substitution...). ${request ? `Learner request: ${request}` : ""}
Explain meaning/form/use/register with 2–4 pitfalls and 3 annotated examples. Then set 4 tasks in a mix of types: transform, complete, correct (a sentence containing a genuine error), produce (write an original sentence using the structure in a given context). Each task needs a model answer.`,
  });
}

export async function generateToefl(memory: LearnerMemory, block: PlanBlock, taskType: ToeflTaskType, request?: string) {
  const spec = TOEFL_TASKS[taskType];
  const common = `${header(memory, block)}

TOEFL task: ${toeflTaskBrief(taskType)}
Original content only. Match the real task format and difficulty (the test spans A2–C2 adaptively; pitch this at upper-intermediate to advanced so a strong candidate is still challenged). Set time_limit_seconds to a realistic per-task budget. Give a one-sentence strategy_tip. ${request ? `Learner request: ${request}` : ""}`;

  switch (taskType) {
    case "reading_complete_the_words":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflCompleteWordsContent,
        user: `${common}
Write a coherent short text (90–130 words) on an everyday or light-academic topic. Create 8 gaps for content words. For each gap, write the word in the passage as {{id}} and provide "shown" = the first half of the letters (round down, minimum 1) and "answer" = the full word. Do not gap the first sentence.`,
      });
    case "reading_daily_life":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflPassageContent,
        user: `${common}
Write an everyday text (a notice, email, message thread, flyer or short informational text; 120–180 words) and 4 multiple-choice questions (4 options each) on main idea, key details and implied meaning. speakers: [] . kind="toefl_passage", task_type="reading_daily_life".`,
      });
    case "reading_academic_passage":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflPassageContent,
        user: `${common}
Write a short academic passage (200–280 words) on a university-course topic (science, history, economics, psychology, art...) and 5 multiple-choice questions (4 options each) on main idea, supporting details, vocabulary in context and inference. speakers: []. kind="toefl_passage", task_type="reading_academic_passage".`,
      });
    case "listening_choose_response":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflChooseResponseContent,
        user: `${common}
Create 6 items. Each: one spoken line in an academic/campus context (a question, request, comment or offer, 8–20 words) and 3 options for the most appropriate response. Vary speech acts and include distractors that are grammatically fine but pragmatically wrong.`,
      });
    case "listening_conversation":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflPassageContent,
        user: `${common}
Write a campus-life conversation script between two speakers (150–220 words). Format each line as "Name: text" on its own line so it can be read aloud by text-to-speech. Provide speakers [{name, role}]. Then 4 multiple-choice questions (4 options) on main idea, detail, speaker intent and implied meaning. kind="toefl_passage", task_type="listening_conversation".`,
      });
    case "listening_announcement":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflPassageContent,
        user: `${common}
Write a campus or academic announcement script (one speaker, 110–160 words) to be read aloud. speakers: [{name, role}]. Then 4 multiple-choice questions (4 options) on purpose, key information, implied meaning and likely next actions. kind="toefl_passage", task_type="listening_announcement".`,
      });
    case "listening_academic_talk":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflPassageContent,
        user: `${common}
Write a short academic talk by a professor (one speaker, 220–300 words) to be read aloud, with clear organisation and one or two idiomatic expressions. speakers: [{name, role}]. Then 5 multiple-choice questions (4 options) on main ideas, details, organisation, inference and vocabulary. kind="toefl_passage", task_type="listening_academic_talk".`,
      });
    case "writing_build_a_sentence":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflBuildSentenceContent,
        user: `${common}
Create 6 items. Each has a short context (e.g. a question someone asked, or a situation), 5–8 shuffled chunks (words or short phrases, with correct capitalisation and final punctuation included in the chunks) and the single correct answer sentence formed by arranging ALL chunks. Make sure only one arrangement is grammatical and natural.`,
      });
    case "writing_email":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflWritingContent,
        user: `${common}
Design an email task in an academic or social situation (a request, giving information, proposing a solution). Give the situation, instructions, 3 required points to cover, min_words 80, discussion: null. kind="toefl_writing", task_type="writing_email". Time limit about 7 minutes.`,
      });
    case "writing_academic_discussion":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflWritingContent,
        user: `${common}
Design an online classroom discussion: a professor's prompt (a debatable question in a course context, 60–90 words) and two student posts (40–60 words each, taking different positions). Instructions: state and support an opinion, contribute to the discussion, respond to the others. min_words 100. required_points: 3 content expectations. kind="toefl_writing", task_type="writing_academic_discussion". Time limit 10 minutes.`,
      });
    case "speaking_listen_and_repeat":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflSpeakingContent,
        user: `${common}
Create 6 sentences to listen to and repeat exactly, increasing in length from ~8 to ~18 words, with natural rhythm, contractions, and features of connected speech. prep_seconds 0, response_seconds 10 each. kind="toefl_speaking", task_type="speaking_listen_and_repeat".`,
      });
    case "speaking_interview":
      return generateStructured({
        system: GENERATION_SYSTEM,
        schema: ToeflSpeakingContent,
        user: `${common}
Design a simulated interview on an academic or campus situation (context: who is interviewing and why). 4 questions that build on each other, moving from experience to opinion to justification. prep_seconds 5, response_seconds 45 each. kind="toefl_speaking", task_type="speaking_interview".`,
      });
    default:
      throw new Error(`Unsupported TOEFL task: ${spec.officialName}`);
  }
}

export interface TeachingOptions {
  studentAge?: number;
  studentLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  concept?: string;
  challengeType?: TeachingContent["challenge_type"];
}

export async function generateTeaching(memory: LearnerMemory, block: PlanBlock, options: TeachingOptions = {}) {
  const constraints = [
    options.studentAge ? `Student age: ${options.studentAge}.` : "Choose a student age that the learner actually teaches (see teaching contexts), varying across days.",
    options.studentLevel ? `Student level: ${options.studentLevel}.` : "Vary the student level across days (A1–C1).",
    options.concept ? `Concept to teach: ${options.concept}.` : "Choose a concept that is genuinely hard to explain well (e.g. present perfect vs past simple, articles, conditionals, modals of deduction, word stress, phrasal verb separability, register).",
    options.challengeType ? `Challenge type: ${options.challengeType}.` : "Rotate the challenge type across days.",
  ].join(" ");
  return generateStructured({
    system: GENERATION_SYSTEM,
    schema: TeachingContent,
    user: `${header(memory, block)}

Create ONE teaching challenge for the learner (who is a teacher). ${constraints}
The "task" must be a precise instruction (e.g. "Explain the present perfect to a 13-year-old A2 learner in under 150 words, with one concept-checking question."). For correct_student_error / answer_student_question, provide the student's words in student_input; otherwise null. evaluation_focus lists the 4 criteria: accuracy, clarity, age appropriateness, pedagogical effectiveness (plus one task-specific criterion). methodology_hint: one line pointing to a relevant approach (CLT, TBL, scaffolding, CCQs, guided discovery...). Time limit 4–6 minutes.`,
  });
}

/** Review block is assembled from memory, not generated by the model. */
export function buildReviewContent(memory: LearnerMemory, maxItems = 8): ReviewContent {
  const vocab = memory.dueVocabulary
    .slice()
    .sort((a, b) => reviewPriority(b) - reviewPriority(a))
    .slice(0, Math.ceil(maxItems * 0.6))
    .map((v, i) => ({
      id: `v${i + 1}`,
      item_type: "vocabulary" as const,
      item_id: v.id,
      prompt: `Define "${v.term}"${v.part_of_speech ? ` (${v.part_of_speech})` : ""} and use it in a sentence${v.collocations.length ? " with one of its collocations" : ""}.`,
      expected: `${v.definition}${v.example ? ` — e.g. "${v.example}"` : ""}${v.collocations.length ? ` Collocations: ${v.collocations.join(", ")}` : ""}`,
      hint: v.definition.split(" ").slice(0, 3).join(" ") + "…",
    }));
  const concepts = memory.dueConcepts
    .slice(0, maxItems - vocab.length)
    .map((c, i) => ({
      id: `c${i + 1}`,
      item_type: "concept" as const,
      item_id: c.id,
      prompt: `Weak spot: "${c.name}". State the rule in one or two sentences and write one correct example sentence.`,
      expected: c.description ?? c.name,
      hint: c.category,
    }));
  const items = [...vocab, ...concepts];
  return {
    kind: "review_set",
    intro:
      items.length > 0
        ? "Active recall first: answer from memory before revealing. Rate yourself honestly; the schedule adapts to it."
        : "Nothing is due for review today.",
    items,
  };
}

export async function generateBlock(memory: LearnerMemory, block: PlanBlock): Promise<ExerciseContent> {
  switch (block.skill) {
    case "vocabulary":
      return generateVocabulary(memory, block);
    case "grammar":
      return generateGrammar(memory, block);
    case "toefl":
      return generateToefl(memory, block, block.exercise_type as ToeflTaskType);
    case "teaching":
      return generateTeaching(memory, block);
    case "review":
      return buildReviewContent(memory);
  }
}
