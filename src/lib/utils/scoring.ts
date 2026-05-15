// Re-export the score primitives so callers can do
//   import { computeMatchScore } from "@/lib/utils/scoring"
// alongside other utils. The math itself lives in lib/matchScore.ts to
// preserve the historical import path used by the API routes.

export {
  STATUS_SCORE,
  IMPORTANCE_WEIGHT,
  computeMatchScore,
  formatScore
} from "../matchScore";
