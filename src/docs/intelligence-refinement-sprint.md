# Intelligence Refinement Sprint

Date: 2026-06-08

## Goal

This sprint refines Career Ladder from a functional AI career platform into a recruiter-aware career intelligence system. The work deliberately avoids new major workflows and instead improves reasoning quality, emotional confidence, output structure, and continuity between existing modules.

## Intelligence Improvements

- Expanded transferable-skill detection beyond the original transition examples to include administrative/office coordination and social/community/digital engagement patterns.
- Strengthened adjacent-career reasoning so recommendations emphasize the professional function behind the user's work, not a superficial title match.
- Improved Career Coach fit language to explain that the user should not pretend their old role was the same job. The stronger strategy is to show the employer the responsibility pattern underneath it.
- Improved transition recommendations to require grounded examples, recruiter-readable framing, and evidence behind each phrase.

## Prompt Strategy Improvements

Interview Prep now asks for:

- interview themes recruiters are likely to test
- likely recruiter concerns
- evidence that would reduce each concern
- role-specific questions tied to the posting and candidate context
- weak-area prep that separates proof gaps, terminology gaps, platform gaps, and transition-framing risks

Pathway Analysis now explicitly follows this order:

1. current experience
2. what already counts
3. why employers care
4. transferable functions
5. adjacent careers
6. recruiter concerns
7. proof gaps
8. practical upskilling

Mock Interview prompts now push feedback to explain how a hiring manager may interpret missing evidence or vague answers.

## Recruiter Realism Goals

Career Ladder should increasingly behave like a recruiter-aware strategist:

- name likely concerns instead of only naming missing skills
- distinguish direct experience from transferable experience
- explain why a transition is realistic without inflating credentials
- identify where the resume language may be weaker than the experience itself
- help users prepare proof, not just keywords

## Transferable Skill Interpretation

The transferable-skill layer now better supports:

- retail to customer success or account support
- hospitality to operations or service operations
- journalism and writing to marketing or communications
- trades to project coordination
- administrative support to operations coordination
- social/community/digital experience to engagement or marketing coordination

Inferred skills remain grounded in user evidence and are framed as possible professional functions, not fabricated claims.

## UX Polish Decisions

- Dashboard and workspace language now emphasizes three guided journeys: Build My Career Profile, Plan My Career, and Win Opportunities.
- Upload insight preview now behaves more like a guided mobile-app step: resume reviewed, early strengths, employer value, friction points, and next move.
- Career Coach includes a compact journey strip so users understand the progression before answering questions.
- Loading states now describe recruiter-aware analysis steps such as identifying transferable strengths and checking proof gaps.
- The loading indicator uses the product's blue accent instead of the older orange emphasis.

## Emotional UX Philosophy

Job seekers often arrive anxious, discouraged, or unsure why they are not getting interviews. The product should create moments like:

- "I did not realize my experience counted that way."
- "This explains why recruiters might hesitate."
- "I know what to strengthen next."

The tone should remain calm, practical, and realistic. Avoid motivational fluff, shame-based copy, and vague AI-generated language.

## Cohesion Strategy Between Workflows

The same intelligence layer should appear across workflows:

- Master Career Profile stores user evidence and inferred transferable-skill notes.
- Career Coach uses profile context and transferable skill signals.
- Pathway analysis starts from current experience before gaps or courses.
- Resume generation/loading states explain recruiter-readable positioning.
- Interview prep and mock interview reference likely recruiter concerns and proof expectations.
- Saved opportunity workspaces organize materials around one role instead of separate tool outputs.

## What Still Needs Future Refinement

- Career Coach still uses a step questionnaire rather than a truly adaptive conversational flow.
- Resume results would benefit from a compact "why this version is stronger" strategy panel.
- Interview prep presentation can be further refined after live generated examples are reviewed.
- Pathway results should be manually QA-tested with career-change examples such as retail to customer success, chef to operations, admin to operations coordinator, and social media to digital marketing.
- The output/opportunity workspace remains the densest page and should get a deeper simplification pass after this sprint.

## Production Safety

No auth, Stripe, credits, middleware, database migrations, saved-output persistence, or generator routing logic was changed. The sprint is limited to deterministic intelligence helpers, prompt instructions, loading/result copy, visual hierarchy, and documentation.

