// Build a resume strategy — guidance for the rewrite prompt that bridges
// the analysis result to the candidate's roles.
//
// Deterministic, no LLM call. Strategy includes:
//   • A short summary direction (1–2 sentences, NOT the final summary —
//     that's written by the rewrite prompt).
//   • Per-role positioning subtitles, drawn from roleMappings.ts when the
//     official title and JD clusters intersect.
//   • Skills the rewrite should surface (clusters covered by both the JD
//     and the resume's evidence).
//   • Bullet reframing pairs are NOT precomputed here — the rewrite
//     prompt has the full resume + analysis context and writes them
//     directly. We pass an empty array so the field exists on the
//     ResumeStrategy shape; downstream code branches on length.

import type {
  AnalysisResult,
  JobRequirement,
  PositioningSubtitle,
  ResumeEvidence,
  ResumeStrategy
} from "../types";
import {
  findPositioningPatterns,
  type RolePositioningPattern
} from "../knowledge/roleMappings";
import { getCluster } from "../knowledge/skillClusters";
import { clustersIn } from "../utils/evidence";

export function buildResumeStrategy(args: {
  requirements: JobRequirement[];
  evidence: ResumeEvidence[];
  matches: AnalysisResult["matches"];
}): ResumeStrategy {
  const jdClusters = new Set<string>();
  for (const r of args.requirements) {
    for (const c of r.skillClusters) jdClusters.add(c);
  }
  const resumeClusters = clustersIn(args.evidence);

  // Build subtitles per unique (company, title) pair seen in evidence.
  const seen = new Set<string>();
  const subtitles: PositioningSubtitle[] = [];
  for (const e of args.evidence) {
    if (e.source.section !== "EXPERIENCE") continue;
    const company = (e.source.company ?? "").trim();
    const title = (e.source.title ?? "").trim();
    if (!company || !title) continue;
    const key = `${company}::${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const patterns = findPositioningPatterns(title);
    if (patterns.length === 0) continue;

    const fragments = chooseFragments(patterns, jdClusters, resumeClusters);
    if (fragments.length === 0) continue;

    subtitles.push({
      company,
      title,
      subtitle: fragments.join(" | ")
    });
  }

  // Surface clusters that the JD asks for AND the resume already proves.
  const surfacedSkills: string[] = [];
  for (const c of jdClusters) {
    if (!resumeClusters.has(c)) continue;
    const cluster = getCluster(c as Parameters<typeof getCluster>[0]);
    if (!cluster) continue;
    surfacedSkills.push(cluster.label);
  }

  // Direction sentence (NOT the final summary — guidance for the rewrite
  // prompt). Names the top JD-side clusters the candidate proves.
  const topClusters = surfacedSkills.slice(0, 3);
  const summary = topClusters.length
    ? `Position the candidate around their proven strength in ${topClusters.join(
        ", "
      )} — leaning into the responsibilities the JD calls out.`
    : `Position the candidate around their broadest transferable strengths from the resume; do not invent claims.`;

  return {
    summary,
    subtitles,
    bulletReframes: [],
    surfacedSkills
  };
}

// Pick 2-3 positioning fragments supported by both the JD's clusters AND
// at least one of the role's typical clusters.
function chooseFragments(
  patterns: RolePositioningPattern[],
  jdClusters: Set<string>,
  resumeClusters: Set<string>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of patterns) {
    // The role's typical clusters must overlap with what the resume
    // actually demonstrates (so we don't claim "Pipeline Ownership" for
    // someone whose evidence doesn't show it).
    const supportedByResume = p.typicalClusters.some((c) =>
      resumeClusters.has(c)
    );
    if (!supportedByResume) continue;

    // The JD must care about at least one of the role's typical clusters
    // (so we don't add fragments the JD has no use for).
    const supportedByJd = p.typicalClusters.some((c) => jdClusters.has(c));
    if (!supportedByJd) continue;

    for (const frag of p.positioningFragments) {
      if (seen.has(frag)) continue;
      seen.add(frag);
      out.push(frag);
      if (out.length >= 3) return out;
    }
  }
  return out;
}
