# Current Generation Architecture

Last reviewed: June 23, 2026

This document describes how Career Ladder currently generates the major career outputs in production code: Career Coach, Career Pathways, tailored resumes, cover letters, and interview prep. It focuses on source inputs, Master Career Profile usage, uploaded resume usage, prompt/reasoning structure, transferable skill extraction, and persistence.

## Executive Summary

Career Ladder is partially profile-first today, but the Master Career Profile is not yet the only source of truth across every workflow.

For signed-in users, several server routes call `resolveProfileFirstResumeText`, which means generation receives a composed context starting with the Master Career Profile and then appending the latest uploaded/session resume as supporting context. This is used by:

- `/api/analyze`
- `/api/generate`
- `/api/opportunities`

However, some workflows still rely on saved snapshots, client session state, or generated output text rather than rehydrating the latest profile at generation time. Anonymous workflows remain uploaded-resume/session based.

The current architecture is best described as:

1. Uploaded resumes can import/enrich the Master Career Profile.
2. Signed-in application generation prefers the Master Career Profile when meaningful profile data exists.
3. Generated outputs are saved as static opportunity/application snapshots.
4. Downstream outputs such as pathway and interview prep often use the saved opportunity snapshot rather than the latest live profile.
5. Transferable skill extraction exists and is used in several places, but not yet as a single shared, explainable generation context for all workflows.

## Key Source Files

- `components/CareerCoachClient.tsx`
- `lib/careerCoach.ts`
- `lib/transferableSkillExtraction.ts`
- `lib/masterCareerProfile.ts`
- `lib/careerProfileStorage.ts`
- `app/api/parse-resume/route.ts`
- `app/api/analyze/route.ts`
- `app/api/generate/route.ts`
- `app/api/opportunities/route.ts`
- `app/api/outputs/route.ts`
- `app/api/outputs/[id]/pathway/route.ts`
- `app/api/outputs/[id]/interview-prep/route.ts`
- `lib/pathway.ts`
- `lib/interviewPrep.ts`
- `lib/rewrite/rewriteResume.ts`
- `lib/rewrite/rewriteCoverLetter.ts`
- `lib/prompts/rewritePrompt.ts`
- `lib/prompts/coverLetterPrompt.ts`
- `components/StepGenerate.tsx`
- `components/StepResults.tsx`

## Shared Architecture Primitives

### Master Career Profile

The Master Career Profile stores cumulative career identity data for authenticated users. It can include work experience, volunteer experience, education, certifications, awards, projects, extracurriculars, skills, achievements, interests, career goals, resume imports, and discovery notes.

Important helpers:

- `importResumeIntoMasterProfile`: imports parsed resume content into the profile.
- `mergeMasterCareerProfiles`: merges new profile fragments additively.
- `composeProfileResumeSource`: flattens profile data into a text source for generation.
- `resolveProfileFirstResumeText`: returns profile-composed text for signed-in users with meaningful profile data; otherwise falls back to uploaded resume text.

Current profile-first format:

```text
MASTER CAREER PROFILE
...
CAREER INTELLIGENCE NOTES
...
LATEST UPLOADED RESUME OR SESSION RESUME
...
```

This is a useful compatibility layer, but it is still a flattened text document. It is not yet a structured canonical generation object with field-level evidence, confidence, freshness, and user-confirmed vs inferred labels.

### Uploaded Resume Inputs

Uploaded resumes still matter in three ways:

1. Anonymous users use uploaded resume/session text directly.
2. Signed-in users can enrich the Master Career Profile through `/api/parse-resume?enrichProfile=1`.
3. Even for signed-in users, the latest uploaded/session resume is appended beneath the Master Career Profile in the composed source.

This means uploads are now an import and context source, not always the sole generation source.

### Transferable Skill Extraction

`lib/transferableSkillExtraction.ts` provides a reusable extraction layer. It identifies:

- explicit skills
- implicit skills
- professional functions
- adjacent career signals
- recruiter concern notes
- evidence notes

It combines direct pattern detection with transition signal helpers and maps real experience into recruiter-readable functions. It is used directly by Career Coach, Career Pathways, Interview Prep, and Master Career Profile enrichment.

It is not yet uniformly passed into every resume and cover letter prompt as a first-class structured block, although inferred skills and notes can enter those prompts through the Master Career Profile text.

### Persistence

Primary persistence uses Supabase tables through helper functions such as `saveGeneratedOutput` and profile storage helpers.

Important persistence behavior:

- `generated_outputs` stores tailored resume text, cover letter text, source job description, clarification answers, and `analysis_snapshot`.
- Pathway and interview prep are stored inside `analysis_snapshot` for saved outputs.
- Resume and cover letter outputs are generated first on the client flow, then saved through `/api/outputs` when the user saves/unlocks.
- Career Coach recommendations are currently client-rendered and not saved as generated outputs.
- Saved output snapshots preserve reopenability, but they can become stale if the Master Career Profile changes later.

## 1. Career Coach Outputs

### Source Inputs

Career Coach is rendered by `components/CareerCoachClient.tsx` and uses the deterministic engine in `lib/careerCoach.ts`.

User answers include:

- current experience
- interests
- work preferences
- lifestyle goals
- ambition and timeline
- learning tolerance
- financial constraints
- education

### Profile Inputs

On load, the client fetches `/api/career-profile` with `cache: "no-store"`. If a profile exists, `formatProfileContext(profile)` converts profile sections into a text block labeled `MASTER CAREER PROFILE CONTEXT`.

That profile context is prepended into `coachInput.currentExperience` alongside the user's typed answer.

Profile sections used include:

- work experience
- volunteer experience
- projects
- extracurriculars
- skills
- career goals
- discovery notes

### Uploaded Resume Inputs

Career Coach does not directly upload or parse a resume. Uploaded resume data can influence Career Coach only if it has already enriched the Master Career Profile or if the user manually includes resume-like experience in the answers.

### Prompt Structure

Career Coach does not currently call the LLM. There is no prompt in the Career Coach workflow.

Instead, it uses deterministic scoring and recommendation logic in `generateCareerCoachMatches`.

### Reasoning Flow

`generateCareerCoachMatches(input)` builds a reasoning pipeline:

1. Combine all user/profile text.
2. Extract discovery insights.
3. Extract transferable skill signals.
4. Extract a transferable skill profile.
5. Infer transition recommendations.
6. Identify professional functions.
7. Score static career match definitions against user input, transferable signals, and discovery signals.
8. Return top career matches with explanations.

Each match includes:

- why it fits
- salary expectation
- day in the life
- typical credentials
- fastest path
- lowest-cost path
- hiring outlook
- AI disruption risk
- recruiter expectations
- likely challenges
- transferable strengths
- likely recruiter concerns
- fit, effort, cost, timeline, salary, and risk evaluation

### Transferable Skill Extraction Usage

Career Coach calls `extractTransferableSkillProfile(Object.values(input).join("\n"))` and uses inferred signals to strengthen adjacent-career matching and explanation.

### Master Career Profile Usage

The Master Career Profile is used as optional context. It influences Career Coach if the signed-in user has profile data and the client successfully fetches it.

It is not the sole source of truth because Career Coach still treats profile text as one part of a combined answer payload, not as a structured authoritative career identity object.

### Persistence Behavior

Career Coach output is not persisted to `generated_outputs` by default. It is computed client-side from the current answers/profile context. Profile data itself persists separately, but Career Coach sessions/recommendations are not currently saved as durable records.

## 2. Career Pathway Outputs

### Source Inputs

Pathway flows are created from opportunity/application context. Inputs can include:

- target role
- company name
- job posting
- current background
- uploaded/session resume text
- resume file name
- workflow intent

### Profile Inputs

`app/api/opportunities/route.ts` calls `resolveProfileFirstResumeText` for signed-in users. If a meaningful Master Career Profile exists, the saved opportunity's `analysis_snapshot.jobContext.resumeText` receives the composed profile-first context.

`app/api/outputs/[id]/pathway/route.ts` later reads the saved output and passes the saved `jobContext.resumeText` into `generatePathwayAnalysis`.

### Uploaded Resume Inputs

Uploaded resume/session text is passed as the fallback context when the user has no meaningful profile or is anonymous. For signed-in users with profile data, the uploaded resume is appended below the Master Career Profile in the composed source.

### Prompt Structure

There are two pathway layers:

1. Free preview: `buildPathwayPreview`
2. Full unlocked analysis: `generatePathwayAnalysis`

The preview is deterministic and returns:

- role overview
- common requirements
- one transferable insight

The full analysis uses `callLlmStructured<PathwayFullAnalysis>` with a recruiter-aware strategy prompt. The system prompt instructs the model to:

- prioritize current experience before courses
- identify transferable functions
- distinguish skill gaps, evidence gaps, and language gaps
- explain realistic transitions
- avoid fake promises, fake credentials, fake salary certainty, and generic certifications
- recommend practical lowest-cost learning when useful

The user prompt includes:

- target role
- company name
- current experience/resume evidence
- current background
- job posting
- transferable skill extraction block
- transferable skill signals
- recruiter concern notes
- transition logic
- low-cost learning options

### Reasoning Flow

Pathway generation follows this intended sequence:

1. Gather role/job context.
2. Gather profile-first or uploaded resume context.
3. Extract transferable skill signals from source text.
4. Extract professional functions and adjacent-career signals.
5. Build recruiter concern notes.
6. Infer transition recommendations.
7. Ask the LLM for a structured pathway analysis.
8. Store the full pathway analysis in the saved output snapshot.

The intended product logic is:

```text
Current Experience
-> Transferable Skills
-> Professional Functions
-> Recruiter Expectations
-> Gaps
-> Fastest/Lowest-Cost Path
-> Learning Recommendations
```

### Transferable Skill Extraction Usage

Pathways use transferable skill extraction directly in both preview and full analysis.

- Preview uses `inferTransferableSkillSignals`.
- Full analysis uses `extractTransferableSkillProfile`, `formatTransferableExtractionForPrompt`, `inferTransferableSkillSignals`, `buildRecruiterConcernNotes`, and `inferTransitionRecommendations`.

### Master Career Profile Usage

For signed-in opportunity flows, the Master Career Profile can be the primary pathway evidence source through `resolveProfileFirstResumeText`.

However, pathway generation uses the profile snapshot saved at opportunity creation time, not necessarily the latest profile at pathway unlock time.

### Persistence Behavior

Pathway preview is stored in `analysis_snapshot.pathway` when the opportunity is created for a career pathway intent.

Full pathway analysis is generated by `/api/outputs/[id]/pathway`, costs 1 credit, and is stored back into `analysis_snapshot.pathway.full`. Existing full analyses are returned without consuming another credit.

## 3. Resume Outputs

### Source Inputs

Resume generation starts in the resume wizard flow:

1. User uploads/pastes resume or builds context.
2. User provides target job posting/title context.
3. `/api/analyze` analyzes the resume/profile context against the job.
4. `StepGenerate` calls `/api/generate`.
5. `/api/generate` produces tailored resume and cover letter in parallel.
6. Client runs ATS/check/rescore loops.
7. User saves/unlocks the output through `/api/outputs`.

Inputs include:

- resumeText from session/upload
- jobPostText
- analysis result
- follow-up answers
- writing locale inferred from the job

### Profile Inputs

`/api/analyze` and `/api/generate` both call `resolveProfileFirstResumeText` with the current signed-in user id and uploaded resume text.

If a meaningful Master Career Profile exists, the analysis and generation source text becomes the composed profile-first resume source.

### Uploaded Resume Inputs

Uploaded resume text is still required by the request schema for `/api/analyze` and `/api/generate`. It is the fallback for anonymous users and for signed-in users without meaningful profile data.

For signed-in users with profile data, it is appended under `LATEST UPLOADED RESUME OR SESSION RESUME`.

### Prompt Structure

Resume generation uses `rewriteResume` and `buildRewriteUserPrompt`.

The system prompt positions the model as an automated resume tailoring engine. It emphasizes:

- truthful evidence selection
- role-specific relevance
- dropping irrelevant bullets/roles/skills
- no invention
- supported keyword usage
- follow-up answers as verified evidence
- ATS-friendly, plain-text resume sections
- role integrity and no title inflation

The user prompt includes:

- job posting
- language/regional style
- original resume and confirmed context, which may be Master Profile plus uploaded resume
- supported alignment from analysis
- weak/unconfirmed hard-skill gaps
- answered requirement evidence
- ATS keyword guidance
- automated resume strategy

### Reasoning Flow

The resume flow uses a multi-stage generation/check pipeline:

1. Analyze candidate context against job requirements.
2. Generate clarification questions for missing/uncertain requirements.
3. Build a resume strategy from requirements, evidence, and matches.
4. Generate a tailored resume using the profile-first or uploaded source text.
5. Sanitize and limit the skills section.
6. Enforce answered follow-up evidence in the resume.
7. Run `/api/check` against the generated resume/cover letter.
8. If the check finds issues, retry generation once with ATS review feedback appended.
9. Run `/api/rescore` against the tailored resume.
10. Save output through `/api/outputs` when the user saves/unlocks.

### Transferable Skill Extraction Usage

Resume generation does not currently pass a dedicated transferable skill extraction block into the resume prompt.

Transferable skills can influence resume generation through:

- Master Career Profile skills/discovery notes created during resume import or guided profile creation
- analysis evidence and matches if the analysis picks up those signals
- prompt instructions to translate real experience into recruiter-readable language

This is an important gap: the transferable skill extraction layer exists, but resume generation does not yet consume it as an explicit structured input the way pathways and interview prep do.

### Master Career Profile Usage

For signed-in users with meaningful profile data, the Master Career Profile is the primary text source through `resolveProfileFirstResumeText` in both analysis and generation.

For anonymous users or users without meaningful profile data, generation is uploaded-resume first.

### Persistence Behavior

`/api/generate` returns generated resume, cover letter, and strategy but does not itself persist the output.

Persistence happens later from `StepResults.saveCurrentOutput`, which posts to `/api/outputs`. That route inserts a row into `generated_outputs` containing:

- `resume_text`
- `cover_letter_text`
- `source_job_description`
- `clarification_answers`
- `analysis_snapshot`
- job/company metadata

Because persistence is client-triggered after generation, generated content can be lost if the user leaves before saving or the save flow fails.

## 4. Cover Letters

### Source Inputs

Cover letter generation runs alongside resume generation in `/api/generate`.

Inputs include:

- profile-first or uploaded resume text
- job posting
- analysis result
- follow-up answers
- writing locale

### Profile Inputs

Cover letter generation receives the same resolved `resumeText` as resume generation. For signed-in users with meaningful profile data, that means the cover letter receives the composed Master Career Profile plus latest uploaded/session resume context.

### Uploaded Resume Inputs

Uploaded resume text is fallback context for anonymous users and signed-in users without meaningful profile data. It is also appended as supplemental context when profile data exists.

### Prompt Structure

Cover letters use `rewriteCoverLetter` and `buildCoverLetterUserPrompt`.

The system prompt requires:

- 3 to 4 short paragraphs
- no headings
- maximum 350 words
- human, specific writing
- no invented metrics, tools, credentials, or achievements
- follow-up answers as verified evidence
- plain text only

The user prompt includes:

- job posting
- language/regional style
- candidate resume/profile context
- candidate narrative themes from analysis strengths and partials
- follow-up answers

### Reasoning Flow

The cover letter flow is simpler than resume generation:

1. Use analysis to identify candidate strengths and partial matches.
2. Use resolved candidate context to understand real evidence.
3. Use follow-up answers as verified evidence.
4. Generate a concise letter aligned to the job.
5. Validate structure and repair via LLM if needed.
6. Return to client with the resume generation response.
7. Persist only when the user saves/unlocks through `/api/outputs`.

### Transferable Skill Extraction Usage

Cover letters do not currently receive a dedicated transferable skill extraction block.

They can inherit transferable skill context indirectly through Master Career Profile notes/skills or analysis themes.

### Master Career Profile Usage

Cover letters are profile-first for signed-in users with meaningful profile data because `/api/generate` resolves profile context before calling `rewriteCoverLetter`.

They are uploaded-resume first for anonymous users and users without meaningful profile data.

### Persistence Behavior

Cover letters are saved to `generated_outputs.cover_letter_text` when the output is saved. Unlock state is handled separately through generated output entitlement fields and credit logic.

## 5. Interview Prep

### Source Inputs

Interview prep is generated from a saved output by `/api/outputs/[id]/interview-prep`.

Inputs include:

- saved output id
- source job description
- saved job context resume text, if present
- generated tailored resume fallback
- generated cover letter
- clarification answers

### Profile Inputs

Interview prep does not currently fetch the live Master Career Profile directly during generation.

It uses profile data only if that data was already included in the saved output snapshot, usually through `analysis_snapshot.jobContext.resumeText` from the opportunity flow or through generated resume/cover letter content derived from profile-first generation.

### Uploaded Resume Inputs

If no saved profile/job context exists, interview prep falls back to `output.resume_text`, which is the saved generated resume. For older outputs, this may be primarily derived from the uploaded resume.

### Prompt Structure

Interview prep uses `generateInterviewPrep` in `lib/interviewPrep.ts`.

The system prompt positions the model as a recruiter-style interview coach. It instructs the model to:

- reason from the job, resume, cover letter, and answers
- produce realistic recruiter/hiring-manager questions
- identify likely concerns and weak areas
- use transferable skill extraction to translate adjacent experience credibly
- avoid inventing facts
- avoid generic STAR coaching
- include role-specific and gap-focused prep

The user prompt includes:

- job description
- tailored resume or saved profile context
- cover letter
- clarification answers
- transferable skill extraction block
- required markdown structure

Required output sections include:

- role and interview themes
- recruiter concerns to prepare for
- likely questions
- screening questions
- behavioural questions
- role-specific questions
- technical or operational questions
- weak-area preparation
- what to prepare before the interview
- strong closing points

### Reasoning Flow

Interview prep follows this flow:

1. Ensure user owns the saved output.
2. Return existing interview prep if already generated.
3. Check credits.
4. Build resume context from saved job context or saved generated resume.
5. Generate transferable skill extraction from resume context, cover letter, and clarification answers.
6. Call LLM to generate recruiter-style prep.
7. Consume 1 credit.
8. Store interview prep in `analysis_snapshot.interviewPrep` and mark `interview_prep_status` complete.

### Transferable Skill Extraction Usage

Interview prep directly calls `extractTransferableSkillProfile` and passes the formatted extraction into the prompt. This is one of the stronger uses of transferable skill reasoning in the current architecture.

### Master Career Profile Usage

Interview prep uses the Master Career Profile indirectly through saved context. It does not currently re-read the latest profile at prep-generation time.

This means interview prep can be profile-informed, but not necessarily profile-current.

### Persistence Behavior

Interview prep is saved into `analysis_snapshot.interviewPrep` for the existing generated output. If it already exists, the route returns it without charging another credit.

## Is the Master Career Profile Currently Acting as the Source of Truth?

Partially, but not completely.

The Master Career Profile is currently a preferred source of candidate context for signed-in users in key generation routes. It is not yet the single authoritative source of truth for every workflow.

### Where the Master Career Profile Is Source-Like Today

The Master Career Profile is used as the preferred candidate context when all of the following are true:

1. The user is authenticated.
2. The profile exists and has meaningful data.
3. The route calls `resolveProfileFirstResumeText`.

This applies to:

- `/api/analyze`
- `/api/generate`
- `/api/opportunities`

Exact profile-to-generation flow:

```text
Authenticated user
-> uploaded resume or guided profile input
-> /api/parse-resume or profile editing flow
-> importResumeIntoMasterProfile / mergeMasterCareerProfiles
-> profile stored in profile memory
-> resolveProfileFirstResumeText(userId, uploadedResumeText)
-> composeProfileResumeSource(profile, uploadedResumeText)
-> analyze / generate / opportunity context
-> resume, cover letter, pathway preview/full, or saved job context
```

For Career Coach:

```text
Authenticated user
-> /api/career-profile
-> formatProfileContext(profile)
-> prepend to Career Coach currentExperience input
-> generateCareerCoachMatches
-> client-rendered recommendations
```

For interview prep through saved opportunities:

```text
Opportunity created with profile-first jobContext.resumeText
-> generated_outputs.analysis_snapshot.jobContext.resumeText
-> /api/outputs/[id]/interview-prep
-> generateInterviewPrep
-> analysis_snapshot.interviewPrep
```

### What Still Relies Primarily on Uploaded Resumes or Snapshots

The following are not fully live-profile-first:

- Anonymous resume generation uses uploaded/session resume text only.
- Signed-in users without meaningful profile data still fall back to uploaded resume text.
- Uploaded resume text is still required by `/api/analyze` and `/api/generate` request schemas.
- The latest uploaded/session resume is appended to the profile source and can influence generation strongly.
- Interview prep uses saved output context, not a fresh read from the current Master Career Profile.
- Pathway unlock uses the saved opportunity snapshot, not necessarily the latest profile state.
- Resume and cover letter persistence saves generated static text, not a live view over the profile.
- Career Coach uses profile as text context but does not persist its own recommendations.

Therefore, the current product is best described as profile-first compatible, not profile-authoritative.

## Architectural Weaknesses That Could Reduce Output Quality

### 1. Profile Context Is Flattened Text

`composeProfileResumeSource` turns structured profile data into a large text document. This preserves compatibility with existing prompts, but the model does not receive a clean schema indicating which facts are user-confirmed, inferred, stale, imported, duplicated, or high-confidence.

Impact: generation can overweight old uploaded resume text, underweight structured profile facts, or miss the distinction between evidence and inference.

### 2. Transferable Skill Extraction Is Not Universal

Career Coach, Pathways, Interview Prep, and profile import use transferable skill extraction directly. Resume and cover letter generation mainly receive transferable context indirectly through profile notes and analysis.

Impact: the strongest differentiator, experience translation, may be inconsistent across documents.

### 3. Saved Output Snapshots Can Become Stale

Pathway and interview prep often use `analysis_snapshot.jobContext.resumeText` or saved generated resume text. They do not always refresh from the latest Master Career Profile.

Impact: users who update their profile after creating an opportunity may not see that improved context in later pathway or interview outputs for the same saved record.

### 4. Career Coach Is Deterministic and Unsaved

Career Coach has a thoughtful rule-based reasoning pipeline, but it does not call the LLM and does not persist recommendations.

Impact: outputs are fast and predictable, but may feel less adaptive, less nuanced, and less continuous than other generated workflows.

### 5. No Central Generation Context Object

Each workflow builds its own context shape. Resume, pathway, interview prep, and coach do not all consume the same canonical `CareerGenerationContext`.

Impact: profile data, transferable skills, recruiter concerns, and user goals can drift between workflows.

### 6. Resume/Cover Persistence Is Not Atomic With Generation

`/api/generate` returns generated content, and the client later saves it through `/api/outputs`.

Impact: if a user closes the page, loses session state, or save fails, generated materials may not be persisted.

### 7. Profile Merge Is Additive But Not Fully Explainable

Profile import adds inferred skills and notes, but the UI/architecture does not yet require user confirmation before those inferred skills influence all future outputs.

Impact: inferred skills can improve output quality, but users may not know which inferred mappings are being used or why.

### 8. Credit Consumption Happens After Some Generation Calls

Pathway and interview prep generate first, then consume credit before persistence.

Impact: if credit consumption fails, the app may spend generation cost without saving the result. This is more of an operational weakness than an output-quality issue, but it affects reliability.

### 9. Latest Uploaded Resume Can Compete With Profile Truth

The composed source includes both Master Career Profile and latest uploaded/session resume. If they conflict, the prompt does not provide a robust conflict-resolution policy beyond ordering.

Impact: older resume wording can still shape output even when the profile has been improved.

### 10. Learning Recommendations Are Workflow-Specific

Pathways include low-cost learning recommendations, but there is not yet a shared learning recommendation layer connected to profile gaps, recruiter concerns, and confirmed goals.

Impact: upskilling advice may be useful but uneven across workflows.

## Recommended Direction

To make the Master Career Profile a true source of truth, Career Ladder should move toward a shared generation context object that includes:

- structured profile facts
- uploaded resume import facts
- inferred transferable skills
- evidence notes
- user-confirmed vs inferred labels
- source freshness
- target role/job context
- recruiter expectations
- likely concerns
- skill gaps
- career goals
- prior saved pathway/interview insights

Then each generator should consume that same object, with workflow-specific prompt sections layered on top.

The next architectural evolution should be:

```text
Master Career Profile
+ Latest user/session context
+ Transferable skill extraction
+ Recruiter expectation model
+ Target opportunity context
= CareerGenerationContext

CareerGenerationContext
-> Resume
-> Cover Letter
-> Pathway
-> Interview Prep
-> Career Coach
```

That would turn the current profile-first compatibility layer into a true career intelligence layer.

## Implementation Update: Shared CareerGenerationContext

Updated June 23, 2026.

Career Ladder now includes a shared `CareerGenerationContext` layer in `lib/careerGenerationContext.ts` and `lib/careerGenerationContextStorage.ts`.

This changes the previous architecture from profile-first compatible to mostly profile-first for migrated generation workflows:

- `/api/analyze` builds a shared context before matching the candidate against a job.
- `/api/generate` builds separate resume and cover-letter contexts and passes formatted context into both prompts.
- `/api/opportunities` saves opportunity context from the shared builder.
- `/api/outputs/[id]/pathway` rehydrates the latest Master Career Profile before generating a new full pathway analysis.
- `/api/outputs/[id]/interview-prep` rehydrates the latest Master Career Profile before generating new interview prep.
- `/api/outputs/[id]/mock-interview` rehydrates the latest Master Career Profile before generating questions or feedback.
- `CareerCoachClient` uses the pure context formatter after fetching the profile.

The Master Career Profile is now the primary candidate context for signed-in users when a meaningful profile exists. It is still not the only possible source because anonymous users rely on uploaded/session evidence, and saved paid outputs remain static historical records.

Remaining architectural limitations:

- Current generators still receive the shared context as prompt text rather than a strict structured schema.
- Relevance filtering is lightweight and keyword-based.
- Existing generated documents are preserved and are not silently regenerated when profile data changes.
- Career Coach recommendations are still client-side and not persisted as durable coaching records.
