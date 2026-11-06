/** Fixture data for the development-only UI preview at /dev/preview. */
import type { Evaluation, ExerciseContent } from "@/lib/ai/schemas";
import type { LessonBrief, LessonPlan } from "@/lib/ai/lesson-schemas";
import type { WorkspaceMessage } from "@/components/lessons/lesson-workspace";

export const fixtureExercises: { id: string; title: string; skill: string; content: ExerciseContent }[] = [
  {
    id: "f-review",
    title: "Active recall: due vocabulary and weak spots",
    skill: "review",
    content: {
      kind: "review_set",
      intro: "Active recall first: answer from memory before revealing. Rate yourself honestly; the schedule adapts to it.",
      items: [
        { id: "v1", item_type: "vocabulary", item_id: "x", prompt: 'Define "to hedge" (verb) and use it in a sentence with one of its collocations.', expected: "To qualify a claim so as to avoid committing fully — e.g. “The authors hedge their conclusions carefully.” Collocations: hedge a claim, hedge one's bets", hint: "To qualify a…" },
        { id: "c1", item_type: "concept", item_id: "y", prompt: 'Weak spot: "article use with abstract nouns". State the rule in one or two sentences and write one correct example sentence.', expected: "Abstract nouns used generally take no article (Happiness is…); a specific instance takes the: the happiness she felt.", hint: "grammar" },
      ],
    },
  },
  {
    id: "f-vocab",
    title: "Vocabulary: Academic argument",
    skill: "vocabulary",
    content: {
      kind: "vocabulary_set",
      theme: "Academic argument",
      intro: "Four items for building and weighing arguments in academic writing and seminar talk.",
      items: [
        { term: "to hedge", part_of_speech: "verb", definition: "To qualify a claim so that you avoid committing to it fully.", example: "The authors hedge their conclusions, noting the small sample size.", collocations: ["hedge a claim", "hedge one's bets", "heavily hedged"], register: "academic", cefr_level: "C1", nuance: "Unlike 'soften', hedging is a deliberate rhetorical strategy expected in academic prose.", usage_note: "Often realised through modals (may), adverbs (arguably) and lexical verbs (suggest)." },
        { term: "tenuous", part_of_speech: "adjective", definition: "Very weak or slight; barely sustainable.", example: "The link between the two findings is tenuous at best.", collocations: ["a tenuous link", "tenuous grounds", "tenuous connection"], register: "formal", cefr_level: "C2", nuance: "'Weak' describes strength; 'tenuous' implies the thing may not hold at all.", usage_note: "Common in 'at best' constructions." },
        { term: "to bear out", part_of_speech: "phrasal verb", definition: "To confirm or support a claim with evidence.", example: "Later studies bore out her early predictions.", collocations: ["bear out a hypothesis", "borne out by the data"], register: "neutral/academic", cefr_level: "C1", nuance: "More formal than 'back up'; often passive: 'is borne out by'.", usage_note: "Irregular: bear – bore – borne." },
        { term: "a sweeping generalisation", part_of_speech: "noun phrase", definition: "A statement that applies something too broadly without evidence.", example: "To say all teenagers dislike reading is a sweeping generalisation.", collocations: ["make a sweeping generalisation", "avoid sweeping generalisations"], register: "neutral", cefr_level: "C1", nuance: "Collocates almost exclusively with 'sweeping'; 'broad generalisation' is weaker.", usage_note: "Useful metalanguage for feedback on student essays." },
      ],
      task: "Write one original sentence per item that shows the meaning through context.",
    },
  },
  {
    id: "f-grammar",
    title: "Grammar: Inversion after negative adverbials",
    skill: "grammar",
    content: {
      kind: "grammar_focus",
      topic: "Inversion after negative adverbials",
      why_this: "You use fronting for emphasis in writing but have not yet shown control of the inverted word order.",
      explanation: {
        meaning: "Fronting a negative or restrictive adverbial (never, rarely, not only, no sooner, under no circumstances) adds emphasis and a formal, rhetorical tone.",
        form: "Adverbial + auxiliary + subject + main verb: 'Rarely have I seen such commitment.' With no auxiliary, add do/does/did.",
        use: "Formal writing, speeches, academic argument; occasionally in literary narrative.",
        register: "Formal. In casual speech it can sound theatrical.",
        pitfalls: ["Forgetting the auxiliary: *Rarely I have seen…", "Inverting after 'only' when it modifies a noun, not an adverbial", "'No sooner … than', not 'when'"],
      },
      examples: [
        { sentence: "Not only did the policy fail, but it also alienated staff.", note: "Not only + did + subject; 'but also' in the second clause." },
        { sentence: "No sooner had the bell rung than the room emptied.", note: "Past perfect in the inverted clause; 'than' introduces the second event." },
        { sentence: "Under no circumstances should grades be shared publicly.", note: "Modal auxiliary moves before the subject." },
      ],
      tasks: [
        { id: "1", type: "transform", instruction: "Rewrite with inversion, starting with the words given.", prompt: "I have seldom heard a more convincing argument. → Seldom …", model_answer: "Seldom have I heard a more convincing argument." },
        { id: "2", type: "complete", instruction: "Complete the sentence.", prompt: "Not only ______ the deadline, they also exceeded the brief.", model_answer: "did they meet" },
        { id: "3", type: "correct", instruction: "Find and correct the error.", prompt: "No sooner the lesson had started when the fire alarm went off.", model_answer: "No sooner had the lesson started than the fire alarm went off." },
        { id: "4", type: "produce", instruction: "Write an original sentence for a formal report.", prompt: "Use 'under no circumstances' with inversion about classroom phones.", model_answer: "Under no circumstances should phones be used during assessments." },
      ],
    },
  },
  {
    id: "f-toefl-read",
    title: "TOEFL practice: Read an Academic Passage",
    skill: "toefl",
    content: {
      kind: "toefl_passage",
      task_type: "reading_academic_passage",
      title: "Urban heat islands",
      passage: "Cities are often several degrees warmer than the rural areas that surround them, a phenomenon known as the urban heat island effect. Dark roofs and asphalt absorb solar radiation during the day and release it slowly at night, while the relative scarcity of vegetation reduces the cooling that evaporation would otherwise provide.\n\nPlanners have responded with a range of measures. Reflective 'cool roofs' can lower surface temperatures substantially, and tree-planting programmes offer shade as well as evaporative cooling. Yet such measures are unevenly distributed: neighbourhoods with fewer trees tend to be those with lower incomes, so heat exposure often tracks existing inequalities.",
      speakers: [],
      questions: [
        { id: "1", question: "What is the main idea of the passage?", options: ["Cities are warmer than rural areas, and the remedies are unequally shared.", "Trees are the only effective solution to urban heat.", "Rural areas are becoming hotter than cities.", "Cool roofs have failed to lower temperatures."], answer_index: 0, explanation: "The passage explains the effect and notes uneven distribution of remedies." },
        { id: "2", question: "According to the passage, why do cities stay warm at night?", options: ["Vegetation releases heat.", "Dark surfaces release stored heat slowly.", "Reflective roofs trap heat.", "Evaporation increases at night."], answer_index: 1, explanation: "Dark roofs and asphalt absorb heat and release it slowly." },
        { id: "3", question: "The word 'scarcity' in paragraph 1 is closest in meaning to", options: ["abundance", "shortage", "variety", "growth"], answer_index: 1, explanation: "Scarcity means shortage." },
      ],
      strategy_tip: "Read the question stem first; locate the paragraph; eliminate options that are too absolute.",
      time_limit_seconds: 300,
    },
  },
  {
    id: "f-toefl-words",
    title: "TOEFL practice: Complete the Words",
    skill: "toefl",
    content: {
      kind: "toefl_complete_words",
      task_type: "reading_complete_the_words",
      title: "A campus notice",
      passage: "The library will extend its opening hours during the exam period. From Monday, students may {{1}} the building until midnight, and additional study {{2}} will be available on the second floor. Please {{3}} that food is not permitted near the computer terminals.",
      gaps: [{ id: "1", shown: "ac", answer: "access" }, { id: "2", shown: "spa", answer: "spaces" }, { id: "3", shown: "no", answer: "note" }],
      strategy_tip: "Use the part of speech the sentence needs before guessing the letters.",
      time_limit_seconds: 120,
    },
  },
  {
    id: "f-toefl-build",
    title: "TOEFL practice: Build a Sentence",
    skill: "toefl",
    content: {
      kind: "toefl_build_sentence",
      task_type: "writing_build_a_sentence",
      items: [
        { id: "1", context: "A classmate asks about tomorrow.", chunks: ["the notes?", "Could you", "before class", "send me"], answer: "Could you send me the notes before class?" },
        { id: "2", context: "Reply to the lab supervisor.", chunks: ["I", "the report", "by Friday.", "will have finished"], answer: "I will have finished the report by Friday." },
      ],
      strategy_tip: "Start from the subject and verb; punctuation chunks go last.",
      time_limit_seconds: 120,
    },
  },
  {
    id: "f-toefl-speak",
    title: "TOEFL practice: Take an Interview",
    skill: "toefl",
    content: {
      kind: "toefl_speaking",
      task_type: "speaking_interview",
      title: "Campus media interview",
      context: "A student journalist is interviewing you about study habits for the campus newsletter.",
      items: [
        { id: "1", text: "How do you usually prepare for a big exam?", prep_seconds: 5, response_seconds: 45 },
        { id: "2", text: "Some students say group study is a waste of time. What do you think, and why?", prep_seconds: 5, response_seconds: 45 },
      ],
      strategy_tip: "Answer, give one reason, give one example — then stop.",
      time_limit_seconds: 240,
    },
  },
  {
    id: "f-teaching",
    title: "Teaching challenge",
    skill: "teaching",
    content: {
      kind: "teaching_challenge",
      challenge_type: "explain_concept",
      student: { age: 13, level: "A2", group: "class of 18", context: "Lower-secondary students in a public school; motivated by games and music, easily lost by metalanguage." },
      concept: "Present perfect (experience) vs past simple",
      task: "Explain, in under 150 words, when we use the present perfect for experiences ('I have been to Rome') versus the past simple ('I went to Rome in 2019'). Include one concept-checking question.",
      student_input: null,
      evaluation_focus: ["accuracy", "clarity", "age appropriateness", "pedagogical effectiveness", "concept-checking"],
      methodology_hint: "Guided discovery with a timeline on the board works well at this age; keep terminology minimal.",
      time_limit_seconds: 300,
    },
  },
];

export const fixtureEvaluation: Evaluation = {
  score: 78,
  summary: "Clear, accurate explanation pitched well for 13-year-olds. The timeline idea is strong; the concept-checking question tests the wrong thing.",
  strengths: ["Short sentences and a concrete example (Rome) the class can picture", "Used a timeline instead of terminology"],
  improvements: ["The CCQ should check 'do we know when?', not the verb form", "Mention that 'ever/never' go with the present perfect"],
  corrections: [
    { original: "When we talk about a experience", corrected: "When we talk about an experience", explanation: "'An' before a vowel sound.", type: "error", concept: { category: "grammar", name: "a/an before vowel sounds" } },
    { original: "I am teacher since 2015", corrected: "I have been a teacher since 2015", explanation: "Duration up to now takes the present perfect; also 'a teacher'.", type: "error", concept: { category: "grammar", name: "present perfect for duration" } },
  ],
  weaknesses_detected: [{ category: "grammar", name: "present perfect for duration", description: "Present simple used for states continuing to now.", severity: 3, evidence: "I am teacher since 2015" }],
  concepts_demonstrated: ["article use with abstract nouns"],
  vocabulary_to_remember: [{ term: "concept-checking question", part_of_speech: "noun", definition: "A question that tests whether students have understood the meaning of a form.", example: "Ask a concept-checking question before the practice stage.", collocations: ["ask a CCQ", "design CCQs"] }],
  per_item: null,
  toefl: null,
  teaching: {
    accuracy: { score: 8, comment: "Rules are correct; 'ever/never' omitted." },
    clarity: { score: 8, comment: "Short, concrete, well-sequenced." },
    age_appropriateness: { score: 9, comment: "Examples and tone fit a 13-year-old class." },
    pedagogy: { score: 6, comment: "CCQ tests form rather than meaning; add a quick pair task." },
    model_version: "Draw a line. Put 'now' at the end. 'I went to Rome in 2019' — point to 2019: we know WHEN. 'I have been to Rome' — wave over the whole line: some time in my life, we don't say when. CCQ: 'I have been to Rome.' Do we know when? (No.) Is it important? (No.)",
  },
  next_step: "Rewrite the CCQ so it checks 'do we know when?', then try the same explanation for a B2 adult.",
};

const fixtureBrief: LessonBrief = {
  class_name: "Tuesday teens B1",
  student_ages: "13–14",
  level: "B1",
  class_size: 18,
  duration_minutes: 50,
  aim: "Students can describe past experiences with the present perfect and ask follow-up questions in the past simple; they keep confusing the two.",
  language_focus: "Present perfect (experience) vs past simple",
  previous_lesson: "We did 'ever/never' with a listening; the quiz showed they can form the present perfect but overuse it for finished-time events.",
  materials_available: "Projector, whiteboard, coursebook unit 4, phones allowed",
  constraints: "Quiet group; two students at A2",
  teacher_ideas: "A 'Find someone who has…' mingle, then pairs interview each other and switch to past simple for details.",
};

const fixturePlan: LessonPlan = {
  title: "Have you ever…? From experiences to details",
  objectives: [
    "Ask and answer 'Have you ever…?' questions about experiences",
    "Switch to the past simple to give details (when, where, who with)",
  ],
  target_language: "Have you ever + past participle? / Yes, I have. – When did you…? / I went… last year.",
  assumed_knowledge: "Past participles of common verbs; 'ever/never' from last lesson.",
  stages: [
    { id: "s1", name: "Lead-in: teacher's experiences", minutes: 6, aim: "Set the context and notice the switch", procedure: "T shows three photos and says: 'I have been to Chile. I went in 2019 with my sister.' Ss guess which two are true. Elicit: which sentence says WHEN?", interaction: "T–Ss", materials: "3 photos on projector", checks: "CCQ: 'I have been to Chile' – do we know when? (No.) 'I went in 2019' – do we know when? (Yes.)" },
    { id: "s2", name: "Find someone who has…", minutes: 12, aim: "Fluency with the target question", procedure: "Ss mingle with a 10-item grid ('…has eaten sushi', '…has lost a phone'). They must find a different name for each line.", interaction: "mingle", materials: "Handout", checks: "ICQ: do you write one name per line or many? Monitor for 'Did you ever…' and feed back on the board." },
    { id: "s3", name: "Noticing: question switch", minutes: 7, aim: "Guided discovery of experience vs detail", procedure: "Board two dialogues; Ss underline which question asks for details. Elicit the rule in their own words.", interaction: "pairs → T–Ss", materials: "Whiteboard", checks: "Ss complete the rule: 'Have you ever…?' = ___ ; 'When did you…?' = ___" },
    { id: "s4", name: "Interview and report", minutes: 20, aim: "Controlled-to-freer practice", procedure: "Pairs interview with the grid: first the experience question, then at least two detail questions. Then each student reports one interesting thing about their partner to a new partner.", interaction: "pairs → new pairs", materials: "Grid from stage 2", checks: "Monitor for tense switch; collect 4 sentences for delayed correction." },
    { id: "s5", name: "Delayed correction and exit ticket", minutes: 5, aim: "Consolidate", procedure: "Correct the collected sentences together. Exit ticket: one 'Have you ever' question + one 'When' question.", interaction: "T–Ss, individual", materials: "Exit slips", checks: "Exit tickets show the two question types." },
  ],
  materials_list: ["3 photos", "'Find someone who…' handout (10 lines)", "Exit slips"],
  anticipated_problems: [
    { problem: "Ss use 'Did you ever…?' in the mingle", solution: "Model the question twice; put it on the board; delayed correction." },
    { problem: "A2 students struggle with participles", solution: "Give them a participle list on the handout; pair them with stronger partners." },
  ],
  differentiation: "Fast finishers write three follow-up questions for each line.",
  assessment: "Monitoring during stage 4 and exit tickets.",
  homework: "Write 5 sentences about experiences + 5 with details (coursebook p. 42).",
};

export const fixtureLesson = {
  lesson: { id: "preview", title: fixturePlan.title, status: "drafting" as const, reflection: null, taught_on: null },
  brief: fixtureBrief,
  plan: { ...fixturePlan, stages: fixturePlan.stages.slice(0, 2), anticipated_problems: [], differentiation: "", assessment: "", homework: null },
  messages: [
    { id: "m1", role: "assistant", content: "Thanks — this is a clear brief, and the mingle-then-interview idea already does most of the work. Two things I need before proposing anything:", questions: ["How confident are the two A2 students with past participles — would a list on the handout be enough?", "Do you want the 'switch to past simple' to be discovered by the students or presented by you?"], proposal: null, proposal_status: null },
    { id: "m2", role: "user", content: "A list is enough. I'd like them to discover it — I've had good results with boardwork and underlining.", questions: [], proposal: null, proposal_status: null },
    { id: "m3", role: "assistant", content: "Then here is a full 50-minute outline built around your mingle. I kept your two stages, added a short lead-in using your own travel examples so the contrast is visible before the mingle, a noticing stage with boardwork, and a report stage so the switch gets real use.", questions: [], proposal: { summary: "Adds a lead-in, a guided-discovery stage and a report stage around your mingle; total 50 min.", plan: fixturePlan }, proposal_status: "pending" },
  ] satisfies WorkspaceMessage[],
};
