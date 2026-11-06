/**
 * TOEFL iBT® specification (test launched 21 January 2026).
 *
 * Verified against the official ETS pages on 2026-11-06:
 *  - https://www.ets.org/toefl/test-takers/ibt/about/content.html  (section table)
 *  - https://www.ets.org/toefl/test-takers/ibt/about/content/{reading,listening,speaking,writing}.html
 *
 * ETS figures: Reading 50 items / ~30 min, Listening 47 items / ~29 min,
 * Writing 12 items / ~23 min, Speaking 11 items / ~8 min ("approx. base time").
 * Scores: four section scores and an overall score on the 1–6 scale; overall is the
 * average of the four sections rounded to the nearest half band. For two years after
 * January 2026 a comparable 0–120 overall score is also reported.
 *
 * TOEFL® is a registered trademark of ETS. This app generates original practice
 * material; it never reproduces ETS questions and its scores are estimates only.
 */

export type ToeflSection = "reading" | "listening" | "speaking" | "writing";

export type ToeflTaskType =
  // Reading
  | "reading_complete_the_words"
  | "reading_daily_life"
  | "reading_academic_passage"
  // Listening
  | "listening_choose_response"
  | "listening_conversation"
  | "listening_announcement"
  | "listening_academic_talk"
  // Writing
  | "writing_build_a_sentence"
  | "writing_email"
  | "writing_academic_discussion"
  // Speaking
  | "speaking_listen_and_repeat"
  | "speaking_interview";

export interface ToeflTaskSpec {
  type: ToeflTaskType;
  section: ToeflSection;
  officialName: string;
  description: string;
  /** How this app renders it. */
  interface: "text" | "tts-listening" | "speech";
  /** Suggested practice length in minutes for one mini-task in a daily session. */
  practiceMinutes: number;
  /** Whether the item is objectively scorable (vs. rubric-rated). */
  scoring: "objective" | "rubric";
}

export const TOEFL_SECTIONS: Record<
  ToeflSection,
  { name: string; items: number; baseMinutes: number; adaptive: boolean; tasks: ToeflTaskType[] }
> = {
  reading: {
    name: "Reading",
    items: 50,
    baseMinutes: 30,
    adaptive: true,
    tasks: ["reading_complete_the_words", "reading_daily_life", "reading_academic_passage"],
  },
  listening: {
    name: "Listening",
    items: 47,
    baseMinutes: 29,
    adaptive: true,
    tasks: ["listening_choose_response", "listening_conversation", "listening_announcement", "listening_academic_talk"],
  },
  writing: {
    name: "Writing",
    items: 12,
    baseMinutes: 23,
    adaptive: false,
    tasks: ["writing_build_a_sentence", "writing_email", "writing_academic_discussion"],
  },
  speaking: {
    name: "Speaking",
    items: 11,
    baseMinutes: 8,
    adaptive: false,
    tasks: ["speaking_listen_and_repeat", "speaking_interview"],
  },
};

export const TOEFL_TASKS: Record<ToeflTaskType, ToeflTaskSpec> = {
  reading_complete_the_words: {
    type: "reading_complete_the_words",
    section: "reading",
    officialName: "Complete the Words",
    description:
      "Complete partially missing words in a short text. Measures vocabulary knowledge and understanding meaning from context.",
    interface: "text",
    practiceMinutes: 4,
    scoring: "objective",
  },
  reading_daily_life: {
    type: "reading_daily_life",
    section: "reading",
    officialName: "Read in Daily Life",
    description:
      "Read short everyday texts (notices, messages, short informational texts) and answer questions on main ideas, key details and implied meaning.",
    interface: "text",
    practiceMinutes: 5,
    scoring: "objective",
  },
  reading_academic_passage: {
    type: "reading_academic_passage",
    section: "reading",
    officialName: "Read an Academic Passage",
    description:
      "Read a short academic passage and answer questions on main ideas, supporting details and important vocabulary.",
    interface: "text",
    practiceMinutes: 6,
    scoring: "objective",
  },
  listening_choose_response: {
    type: "listening_choose_response",
    section: "listening",
    officialName: "Listen and Choose a Response",
    description:
      "Listen to a spoken prompt and choose the most appropriate response. Measures understanding of meaning, intent and patterns of spoken academic English.",
    interface: "tts-listening",
    practiceMinutes: 4,
    scoring: "objective",
  },
  listening_conversation: {
    type: "listening_conversation",
    section: "listening",
    officialName: "Listen to a Conversation",
    description:
      "Listen to a campus-life conversation and answer questions on main ideas, key details, speaker intent and implied meaning.",
    interface: "tts-listening",
    practiceMinutes: 5,
    scoring: "objective",
  },
  listening_announcement: {
    type: "listening_announcement",
    section: "listening",
    officialName: "Listen to an Announcement",
    description:
      "Listen to an academic or campus announcement; questions target purpose, key information, implied meaning and likely next actions.",
    interface: "tts-listening",
    practiceMinutes: 4,
    scoring: "objective",
  },
  listening_academic_talk: {
    type: "listening_academic_talk",
    section: "listening",
    officialName: "Listen to an Academic Talk",
    description:
      "Listen to a short academic talk; questions target main ideas, supporting details, organisation, inferences and occasionally idiomatic vocabulary.",
    interface: "tts-listening",
    practiceMinutes: 6,
    scoring: "objective",
  },
  writing_build_a_sentence: {
    type: "writing_build_a_sentence",
    section: "writing",
    officialName: "Build a Sentence",
    description: "Arrange words or phrases to form a complete, grammatical sentence or question. Measures sentence-structure knowledge.",
    interface: "text",
    practiceMinutes: 4,
    scoring: "objective",
  },
  writing_email: {
    type: "writing_email",
    section: "writing",
    officialName: "Write an Email",
    description:
      "Write an email in an academic or social situation (a request, information, a proposed solution). Measures clarity, staying on topic and conventions.",
    interface: "text",
    practiceMinutes: 7,
    scoring: "rubric",
  },
  writing_academic_discussion: {
    type: "writing_academic_discussion",
    section: "writing",
    officialName: "Write for an Academic Discussion",
    description:
      "Contribute to an online classroom discussion by stating and supporting an opinion, responding to others and writing in an academic tone.",
    interface: "text",
    practiceMinutes: 10,
    scoring: "rubric",
  },
  speaking_listen_and_repeat: {
    type: "speaking_listen_and_repeat",
    section: "speaking",
    officialName: "Listen and Repeat",
    description:
      "Listen to short sentences and repeat them exactly. Measures processing of spoken English and accurate, intelligible speech.",
    interface: "speech",
    practiceMinutes: 3,
    scoring: "objective",
  },
  speaking_interview: {
    type: "speaking_interview",
    section: "speaking",
    officialName: "Take an Interview",
    description:
      "A simulated interview on academic or campus situations: answer questions about experiences and opinions with clear communication, natural pace and appropriate language.",
    interface: "speech",
    practiceMinutes: 6,
    scoring: "rubric",
  },
};

export const TOEFL_TASK_TYPES = Object.keys(TOEFL_TASKS) as ToeflTaskType[];

/** Rotation order used by the daily planner (Reading → Listening → Speaking → Writing). */
export const TOEFL_SECTION_ROTATION: ToeflSection[] = ["reading", "listening", "speaking", "writing"];

export function sectionOf(task: ToeflTaskType): ToeflSection {
  return TOEFL_TASKS[task].section;
}

/** Overall band = mean of the four section bands rounded to the nearest 0.5 (ETS rule). */
export function overallBand(sections: Record<ToeflSection, number>): number {
  const mean = (sections.reading + sections.listening + sections.speaking + sections.writing) / 4;
  return roundToHalfBand(mean);
}

export function roundToHalfBand(value: number) {
  const clamped = Math.min(6, Math.max(1, value));
  // ETS example: 5.125 → 5 (nearest half band, ties round down toward .0/.5 boundary)
  return Math.round(clamped * 2 - Number.EPSILON) / 2;
}

/** Map a 0–100 practice percentage to an estimated 1–6 band (practice estimate only). */
export function percentToBand(percent: number): number {
  const p = Math.min(100, Math.max(0, percent));
  return roundToHalfBand(1 + (p / 100) * 5);
}

export const TOEFL_DISCLAIMER =
  "Practice scores are estimates produced by an AI coach using the public ETS task descriptions. They are not official ETS scores, and the adaptive sections of the real test cannot be fully reproduced here.";
