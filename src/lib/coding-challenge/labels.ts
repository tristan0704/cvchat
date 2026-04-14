import type {
  CodingChallengeDifficulty,
  CodingChallengeLanguage,
} from "@/lib/coding-challenge/types";

export const LANGUAGE_LABELS: Record<CodingChallengeLanguage, string> = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
};

export const DIFFICULTY_LABELS: Record<CodingChallengeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
