import type { Metadata } from "next";

const siteUrl = "https://www.careerladder.ca";
const socialImage = "/career-ladder-recruiter-interview.jpg";

export type MarketingPageKey =
  | "career-discovery"
  | "career-transition"
  | "career-pathways"
  | "resume-builder"
  | "interview-prep"
  | "mock-interviews"
  | "master-career-profile"
  | "application-tracking";

export type MarketingPage = {
  key: MarketingPageKey;
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  proof: Array<{
    label: string;
    title: string;
    body: string;
  }>;
  story: Array<{
    title: string;
    body: string;
  }>;
  related: Array<{
    label: string;
    href: string;
  }>;
};

export const marketingPages: Record<MarketingPageKey, MarketingPage> = {
  "career-discovery": {
    key: "career-discovery",
    path: "/career-discovery",
    eyebrow: "Career discovery",
    title: "Career Discovery",
    description:
      "Explore realistic career directions with recruiter-aware guidance that translates your strengths, preferences, and experience into possible next moves.",
    headline: "Find direction when the next move is not obvious.",
    intro:
      "Career Ladder helps you look beyond job titles and identify the professional patterns already present in your experience: how you solve problems, work with people, handle pressure, and build momentum.",
    primaryCta: { label: "Explore my direction", href: "/?step=intake" },
    secondaryCta: { label: "View career pathways", href: "/career-pathways" },
    proof: [
      {
        label: "Strength signals",
        title: "Start with real experience",
        body: "The goal is not a personality quiz. It is a practical read on what your work, school, service, or community experience may already prove."
      },
      {
        label: "Career patterns",
        title: "Translate hidden evidence",
        body: "Organizing shifts, helping customers, resolving conflict, writing under deadlines, or coordinating projects can all point toward credible directions."
      }
    ],
    story: [
      {
        title: "Useful for uncertain job seekers",
        body: "Career discovery is for people who know they need a change but do not yet know which role or pathway fits their strengths."
      },
      {
        title: "Designed to become profile-aware",
        body: "As the Master Career Profile grows, discovery can become more personalized without forcing the user through repetitive forms."
      }
    ],
    related: [
      { label: "Career Pathways", href: "/career-pathways" },
      { label: "Master Career Profile", href: "/master-career-profile" }
    ]
  },
  "career-transition": {
    key: "career-transition",
    path: "/career-transition",
    eyebrow: "Career transitions",
    title: "Career Transition Guidance",
    description:
      "Translate your existing experience into recruiter-readable evidence for realistic career changes and adjacent roles.",
    headline: "Move into new work without erasing what you have already done.",
    intro:
      "Career Ladder helps identify which parts of your background transfer, which gaps may concern recruiters, and how to position a career change honestly.",
    primaryCta: { label: "Map my transition", href: "/?step=intake" },
    secondaryCta: { label: "See transferable examples", href: "/#example-transformation" },
    proof: [
      {
        label: "Example",
        title: "Chef to operations coordinator",
        body: "Kitchen leadership may show workflow coordination, inventory planning, vendor communication, quality control, and calm execution under pressure."
      },
      {
        label: "Example",
        title: "Retail to customer success",
        body: "Retail management may show customer retention, escalation handling, coaching, prioritization, and accountable follow-through."
      }
    ],
    story: [
      {
        title: "Realistic overlap, not fantasy pivots",
        body: "The transition story should explain why the move is plausible, what still needs proof, and which evidence should be surfaced first."
      },
      {
        title: "Recruiter-readable framing",
        body: "Career Ladder keeps the user's facts intact while translating those facts into the language hiring teams understand."
      }
    ],
    related: [
      { label: "Retail to customer success", href: "/career-transitions/retail-to-customer-success" },
      { label: "Career Pathways", href: "/career-pathways" }
    ]
  },
  "career-pathways": {
    key: "career-pathways",
    path: "/career-pathways",
    eyebrow: "Career pathways",
    title: "Career Pathways",
    description:
      "Compare your experience against real role expectations and identify transferable strengths, likely gaps, and practical next steps.",
    headline: "See the shortest realistic path toward the role you want.",
    intro:
      "Career Pathways connects target-role expectations with your current experience so you can understand what already overlaps, what needs work, and what to prepare next.",
    primaryCta: { label: "Analyze a pathway", href: "/?step=intake" },
    secondaryCta: { label: "Explore transitions", href: "/career-transition" },
    proof: [
      {
        label: "Free preview",
        title: "Role expectations first",
        body: "Start with common requirements and one transferable insight before unlocking a personalized gap analysis."
      },
      {
        label: "Premium analysis",
        title: "Fastest and lowest-cost paths",
        body: "Unlocked pathway guidance focuses on practical sequencing, recruiter-visible gaps, and realistic proof."
      }
    ],
    story: [
      {
        title: "Built for job-seeker uncertainty",
        body: "Pathway analysis helps people decide whether a transition is plausible before spending money, time, or confidence on the wrong next step."
      },
      {
        title: "Ready for future learning recommendations",
        body: "Course and certification suggestions should emerge only when they close a real pathway gap."
      }
    ],
    related: [
      { label: "Career Transition", href: "/career-transition" },
      { label: "Career Discovery", href: "/career-discovery" }
    ]
  },
  "resume-builder": {
    key: "resume-builder",
    path: "/resume-builder",
    eyebrow: "Resume strategy",
    title: "Resume Builder",
    description:
      "Create role-specific resumes from a living career profile, with recruiter-aware positioning and truthful transferable skill framing.",
    headline: "Generate resumes from your career story, not a blank template.",
    intro:
      "Career Ladder treats tailored resumes as outputs from a larger career profile. The goal is to select and frame the evidence that matters for a specific role.",
    primaryCta: { label: "Tailor my resume", href: "/?step=resume" },
    secondaryCta: { label: "Build my profile", href: "/profile" },
    proof: [
      {
        label: "Profile-first",
        title: "Your master profile becomes the source",
        body: "Uploaded resumes can enrich career memory, while tailored resumes become role-specific views of that evidence."
      },
      {
        label: "Recruiter lens",
        title: "Position without overclaiming",
        body: "The system helps translate real evidence into stronger language without inventing tools, credentials, or metrics."
      }
    ],
    story: [
      {
        title: "Still supports the existing upload flow",
        body: "Users can continue uploading a resume and generating tailored materials while the product grows toward persistent career memory."
      },
      {
        title: "Built for future continuity",
        body: "Resume work should improve interviews, pathways, and future application tracking instead of staying isolated."
      }
    ],
    related: [
      { label: "How to tailor a resume", href: "/resume-help/how-to-tailor-a-resume-for-a-job-posting" },
      { label: "Master Career Profile", href: "/master-career-profile" }
    ]
  },
  "interview-prep": {
    key: "interview-prep",
    path: "/interview-prep",
    eyebrow: "Interview prep",
    title: "Interview Prep",
    description:
      "Prepare with recruiter-style questions, likely follow-ups, weak-area preparation, and role-specific guidance.",
    headline: "Prepare for what hiring teams are likely to test.",
    intro:
      "Career Ladder uses role context, resume evidence, and pathway signals to generate more realistic interview prep than generic question lists.",
    primaryCta: { label: "Generate interview prep", href: "/?step=intake" },
    secondaryCta: { label: "Try an example", href: "/interview-prep/account-manager-interview-questions" },
    proof: [
      {
        label: "Most likely",
        title: "Questions with reasoning",
        body: "Interview prep should explain why each question may appear and what the recruiter is evaluating."
      },
      {
        label: "Weak areas",
        title: "Prepare for the challenge points",
        body: "The strongest prep identifies where experience may be adjacent, missing, or likely to trigger follow-up questions."
      }
    ],
    story: [
      {
        title: "Works from role context first",
        body: "A resume can personalize the prep, but users can start from the job title, company, or posting when they need fast role-specific guidance."
      },
      {
        title: "Connects into mock interviews",
        body: "Generated prep can become practice questions and feedback inside the mock interview flow."
      }
    ],
    related: [
      { label: "Account Manager interview questions", href: "/interview-prep/account-manager-interview-questions" },
      { label: "Mock Interviews", href: "/mock-interviews" }
    ]
  },
  "mock-interviews": {
    key: "mock-interviews",
    path: "/mock-interviews",
    eyebrow: "Mock interviews",
    title: "Mock Interviews",
    description:
      "Practice recruiter-style interview questions one at a time and receive structured feedback on clarity, relevance, proof, and framing.",
    headline: "Practice the conversation before it counts.",
    intro:
      "Mock interviews turn preparation into a focused practice flow: answer one question at a time, save progress, and review hiring-manager-style feedback.",
    primaryCta: { label: "Start mock interview", href: "/?step=intake" },
    secondaryCta: { label: "Prepare first", href: "/interview-prep" },
    proof: [
      {
        label: "One question at a time",
        title: "Focused practice",
        body: "Users can build answers gradually instead of facing a wall of static interview notes."
      },
      {
        label: "Feedback report",
        title: "Evaluate clarity and proof",
        body: "Feedback should identify what worked, what was missing, and how to frame experience more credibly."
      }
    ],
    story: [
      {
        title: "Designed for confidence under pressure",
        body: "The experience should feel calm, constructive, and tactical rather than like a generic AI chat."
      },
      {
        title: "Powered by opportunity context",
        body: "The best practice questions come from the role, recruiter expectations, and the user's own evidence."
      }
    ],
    related: [
      { label: "Interview Prep", href: "/interview-prep" },
      { label: "Career Pathways", href: "/career-pathways" }
    ]
  },
  "master-career-profile": {
    key: "master-career-profile",
    path: "/master-career-profile",
    eyebrow: "Master Career Profile",
    title: "Master Career Profile",
    description:
      "Build a persistent career memory that stores experience, skills, projects, achievements, and recruiter-readable interpretations over time.",
    headline: "Your career memory should outlast any single resume.",
    intro:
      "The Master Career Profile is the foundation for profile-first generation: resumes, interviews, pathways, and future recommendations can all draw from the same evolving identity.",
    primaryCta: { label: "Open my profile", href: "/profile" },
    secondaryCta: { label: "Start with a goal", href: "/?step=intake" },
    proof: [
      {
        label: "Source of truth",
        title: "Generated resumes become outputs",
        body: "The profile stores reusable career evidence while tailored resumes become role-specific representations."
      },
      {
        label: "Cumulative",
        title: "Additive career memory",
        body: "Resume uploads and guided workflows should enrich the profile without automatically erasing prior experience."
      }
    ],
    story: [
      {
        title: "Built for lifelong use",
        body: "Career Ladder should grow more useful as users add work, projects, certifications, goals, and transitions."
      },
      {
        title: "Enables better intelligence",
        body: "A persistent profile allows pathways, interviews, and learning recommendations to become more contextual."
      }
    ],
    related: [
      { label: "Resume Strategy", href: "/resume-builder" },
      { label: "Career Discovery", href: "/career-discovery" }
    ]
  },
  "application-tracking": {
    key: "application-tracking",
    path: "/application-tracking",
    eyebrow: "Application tracking",
    title: "Application Tracking",
    description:
      "Track opportunities, generated materials, interview prep, recruiter notes, interview rounds, and offer details in one career workspace.",
    headline: "Keep each opportunity connected from application to offer.",
    intro:
      "Application tracking is the workspace layer: saved opportunities, materials, interview prep, status, recruiter details, follow-ups, and offer context live together instead of scattering across files.",
    primaryCta: { label: "View dashboard", href: "/dashboard" },
    secondaryCta: { label: "Start a new opportunity", href: "/?step=intake" },
    proof: [
      {
        label: "Opportunity-first",
        title: "Track the role, not just the output",
        body: "Saved records should represent hiring opportunities with materials, preparation, status, and future follow-up."
      },
      {
        label: "Offer context",
        title: "Compare more than compensation",
        body: "Capture salary, work model, growth potential, commute, benefits, and career fit so the decision stays strategic."
      }
    ],
    story: [
      {
        title: "Useful now, extensible later",
        body: "Each saved role can now carry status, notes, interview rounds, recruiter information, follow-up timing, and offer details."
      },
      {
        title: "Connected to every service",
        body: "Resume outputs, cover letters, pathways, and mock interview progress should all attach to the opportunity."
      }
    ],
    related: [
      { label: "Career Pathways", href: "/career-pathways" },
      { label: "Mock Interviews", href: "/mock-interviews" }
    ]
  }
};

export const marketingPageList = Object.values(marketingPages);

export function getMarketingPage(key: MarketingPageKey) {
  return marketingPages[key];
}

export function createMarketingMetadata(key: MarketingPageKey): Metadata {
  const page = getMarketingPage(key);
  const canonicalUrl = `${siteUrl}${page.path}`;
  const title = `${page.title} | Career Ladder`;

  return {
    title,
    description: page.description,
    alternates: {
      canonical: page.path
    },
    openGraph: {
      title,
      description: page.description,
      url: canonicalUrl,
      siteName: "Career Ladder",
      type: "website",
      images: [
        {
          url: socialImage,
          alt: "Recruiter reviewing a resume during an interview conversation"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: [socialImage]
    }
  };
}
