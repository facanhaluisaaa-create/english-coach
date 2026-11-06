import type { Skill } from "@/lib/db/types";

export interface PlanBlock {
  skill: Skill;
  exercise_type: string;
  title: string;
  estimated_minutes: number;
  focus: string;
}
