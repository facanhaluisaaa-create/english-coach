"use client";

import type { Evaluation, ExerciseContent } from "@/lib/ai/schemas";
import { VocabularyExercise } from "./vocabulary-exercise";
import { GrammarExercise } from "./grammar-exercise";
import { TeachingExercise } from "./teaching-exercise";
import { ReviewExercise } from "./review-exercise";
import { ToeflPassageExercise } from "./toefl-passage-exercise";
import { ToeflCompleteWordsExercise } from "./toefl-complete-words-exercise";
import { ToeflChooseResponseExercise } from "./toefl-choose-response-exercise";
import { ToeflBuildSentenceExercise } from "./toefl-build-sentence-exercise";
import { ToeflWritingExercise } from "./toefl-writing-exercise";
import { ToeflSpeakingExercise } from "./toefl-speaking-exercise";

export function ExerciseSwitch({
  content,
  onSubmit,
  submitting,
  evaluation,
  savedResponse,
}: {
  content: ExerciseContent;
  onSubmit: (response: unknown) => void;
  submitting: boolean;
  evaluation?: Evaluation | null;
  savedResponse?: unknown;
}) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const common = { onSubmit, submitting, evaluation, savedResponse: savedResponse as any };
  switch (content.kind) {
    case "vocabulary_set":
      return <VocabularyExercise content={content} {...common} />;
    case "grammar_focus":
      return <GrammarExercise content={content} {...common} />;
    case "teaching_challenge":
      return <TeachingExercise content={content} {...common} />;
    case "review_set":
      return <ReviewExercise content={content} {...common} />;
    case "toefl_passage":
      return <ToeflPassageExercise content={content} {...common} />;
    case "toefl_complete_words":
      return <ToeflCompleteWordsExercise content={content} {...common} />;
    case "toefl_choose_response":
      return <ToeflChooseResponseExercise content={content} {...common} />;
    case "toefl_build_sentence":
      return <ToeflBuildSentenceExercise content={content} {...common} />;
    case "toefl_writing":
      return <ToeflWritingExercise content={content} {...common} />;
    case "toefl_speaking":
      return <ToeflSpeakingExercise content={content} {...common} />;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
