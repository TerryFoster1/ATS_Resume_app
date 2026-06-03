# Homepage Promise Journey Audit

Date: 2026-06-03

## Scope

This audit reviews whether the product journey delivers on the homepage promise:

> Not getting interviews? Let's fix what's holding you back.

Reviewed surfaces:

- Homepage hero
- Resume upload flow
- Career Coach
- Career transition / pathway logic
- Resume analysis and generated results
- Interview prep and mock interview feedback

No broad product rewrites were made in this pass. The only implementation changes were homepage hero cleanup and visual hierarchy refinements.

## Where The Experience Feels Insightful

### Homepage

The homepage is now closer to the right emotional promise. The hero visual tells a stronger story:

- Your experience
- What employers actually see
- Relevant opportunities

This supports the idea that the user's background may be more valuable than their current resume makes it look.

### Analysis Step

`components/StepAnalysis.tsx` has useful recruiter-aware ingredients:

- Match confidence and fit language
- Questions worth answering
- Capability clustering so the user is not asked repetitive questions
- Transformed bullets from user answers

This surface can create the right "Career Ladder understands the gap" feeling, but only after the user reaches job-context analysis.

### Career Coach

`components/CareerCoachClient.tsx` already asks about experience, interests, preferences, lifestyle, ambition, learning tolerance, budget, and education. Results include recruiter expectations, concerns, realistic paths, salary, credentials, and transferable strengths.

The underlying content direction is strong. The remaining weakness is interaction feel: it still behaves like a sequential questionnaire rather than an adaptive conversation.

### My First Resume

`components/JobIntentFlow.tsx` contains one of the strongest experience-discovery moments. It asks about responsibility, service, recognition, activities, and overlooked experience, then explains what those can prove.

This is aligned with the emotional goal: "I have more experience than I thought."

### Interview / Mock Interview

`components/MockInterviewClient.tsx` has strong recruiter realism:

- Why they ask
- What they are evaluating
- Feedback on proof, relevance, transferable framing, and recruiter confidence
- Staged generation and feedback loading

This feels closer to "hiring manager help" than generic question generation.

## Where The Promise Breaks

### 1. Resume Upload Is Still Too Mechanical

`components/StepResume.tsx` is the biggest mismatch after the homepage.

Current language includes:

- "Bring in your resume"
- "Upload module"
- "Choose a resume file"
- "We extract the text into an editable review space"
- "Extracted text from..."

Problem:

The homepage promises insight into what is holding the user back. The upload screen then feels like document processing. It does not immediately prove that Career Ladder understands the user's background.

Recommended next move:

After upload, show a lightweight "We've reviewed your experience" insight panel before asking for job context or routing choices.

Suggested sections:

- Strengths Career Ladder noticed
- Potential opportunities
- Potential gaps or recruiter concerns
- What would you like help with?

This should be generated from parsed resume text plus existing transferable skill extraction where possible.

### 2. Upload Does Not Immediately Close The Emotional Loop

The user clicks "Upload My Resume" after seeing:

> Let's fix what's holding you back.

But the current flow asks them to review extracted text and continue. That is useful operationally, but it delays the first value moment.

Recommended next move:

Keep editable text review, but add a first-impression insight summary above it:

- "We found customer-facing experience, leadership signals, and relationship-management evidence."
- "Some employers may still need clearer proof of tools, outcomes, or role-specific language."

This should be framed as early analysis, not final diagnosis.

### 3. Career Coach Still Feels Like A Form

Career Coach has strong output fields, but the interaction is a static eight-question sequence.

Problem:

For a frustrated user, eight empty prompts can feel like work before relief.

Recommended next move:

Add an initial quick-start mode:

- "I don't know what I want"
- "I'm not getting interviews"
- "I want better pay"
- "I want to change industries"
- "I need lower stress"

Then adapt the first two questions based on that choice. This can be done without building a full chat system.

### 4. Resume Results Need More Rationale

`components/StepResults.tsx` presents generated documents well enough, but the user may not understand why the resume changed.

Problem:

The output can still feel like a generated document rather than a strategy.

Recommended next move:

Add a "Why this version is stronger" panel above the locked/unlocked document preview:

- Positioning strategy
- Recruiter-readable evidence added
- Keywords or requirements addressed
- Remaining risks or details to verify

This makes the paid result feel strategic and worth unlocking.

### 5. Interview Prep Is Stronger After Generation Than Before Unlock

Interview and mock interview logic includes recruiter concerns and evaluation focus, but the pre-generation state is still framed around credits and generated prep.

Recommended next move:

Before charging or generating, show one preview insight:

- Likely recruiter concern
- One question they may ask
- What a strong answer must prove

This reinforces value without exposing the full paid output.

### 6. Pathway Flow Has The Right Logic But Needs User-Facing Sequencing

`lib/pathway.ts` explicitly prompts the engine to think:

Current experience -> transferable functions -> adjacent careers -> proof gaps -> practical upskilling.

That is correct.

Recommended next move:

Ensure the UI always presents pathway output in that order:

1. What experience already counts
2. Why employers may value it
3. Where the transition is realistic
4. What may still cause hesitation
5. What to do next

Avoid starting with "career path" or "course" language.

## Homepage Cleanup Implemented

The homepage was adjusted to reduce marketing clutter and make the hero visual reinforce the promise more directly.

Changes:

- Removed the meaningless hero eyebrow label.
- Reduced hero headline scale.
- Shifted the hero visual from "New opportunities" / "Possible career paths" toward employer interpretation.
- Emphasized the center card: "What employers actually see."
- Changed the right card to "Relevant opportunities."
- Added the support line: "Your experience may already qualify you for more opportunities than you realize."

## Recommended Implementation Order

### Phase 1: Post-Upload Insight Preview

Build the immediate value screen after resume upload:

- Strengths noticed
- Potential opportunities
- Potential gaps
- Next goal cards

This is the highest-impact fix because it closes the gap directly after the homepage CTA.

### Phase 2: Resume Results Rationale

Add a compact strategy panel to results:

- What changed
- Why recruiters care
- What evidence was emphasized
- What to verify before using

### Phase 3: Career Coach Quick-Start

Reduce questionnaire friction with an initial situation selector and adaptive first prompts.

### Phase 4: Interview Preview Before Unlock

Show one recruiter concern, one likely question, and one answer-quality expectation before full interview prep generation.

## Current Risk Assessment

The homepage promise is strong enough now that weak post-upload UX will feel more noticeable. The product has the intelligence layers to deliver on the promise, but the first upload screen does not expose them soon enough.

The most important next product move is not a new feature. It is surfacing existing intelligence immediately after upload.
