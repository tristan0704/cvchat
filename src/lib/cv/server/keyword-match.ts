import "server-only";

import type { CvRoleMatchAnalysis } from "@/lib/cv/types";
import type { RoleProfile } from "@/lib/cv/server/types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function matchesPhrase(haystack: string, phrase: string) {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  if (haystack.includes(normalizedPhrase)) return true;

  const tokens = tokenize(phrase);
  if (tokens.length === 0) return false;

  const hitCount = tokens.filter((token) => haystack.includes(token)).length;
  return hitCount / tokens.length >= 0.75;
}

function collectMatches(haystack: string, phrases: string[]) {
  return phrases.filter((phrase) => matchesPhrase(haystack, phrase));
}

function scoreBucket(matches: number, total: number, weight: number) {
  if (total === 0) return 0;
  return (matches / total) * weight;
}

export function analyzeKeywordMatch(
  cvText: string,
  profile: RoleProfile
): CvRoleMatchAnalysis {
  const normalizedCv = normalize(cvText);
  const matchedMustHave = collectMatches(normalizedCv, profile.mustHave);
  const missingMustHave = profile.mustHave.filter(
    (entry) => !matchedMustHave.includes(entry)
  );
  const niceToHaveMatches = collectMatches(normalizedCv, profile.niceToHave);
  const bonusMatches = collectMatches(normalizedCv, profile.bonus);

  const weightedScore =
    scoreBucket(matchedMustHave.length, profile.mustHave.length, 70) +
    scoreBucket(niceToHaveMatches.length, profile.niceToHave.length, 20) +
    scoreBucket(bonusMatches.length, profile.bonus.length, 10);

  const score = Math.max(0, Math.min(100, Math.round(weightedScore)));

  const matched = [
    ...matchedMustHave,
    ...niceToHaveMatches.filter((entry) => !matchedMustHave.includes(entry)),
  ];

  const summary =
    missingMustHave.length > 0
      ? `Solider Match fuer ${profile.role}, aber einige Must-Haves sind im CV nicht klar belegt.`
      : `Guter Keyword-Match fuer ${profile.role} mit mehreren passenden Signalen im CV.`;

  return {
    score,
    matched,
    missingMustHave,
    niceToHaveMatches,
    bonusMatches,
    summary,
  };
}
