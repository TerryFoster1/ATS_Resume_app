export type SeoHub =
  | "interview-prep"
  | "career-transitions"
  | "resume-help"
  | "cover-letters"
  | "job-guides"
  | "recruiter-insights";

export type SeoPage = {
  hub: SeoHub;
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  canonicalPath: string;
  sections: Array<{
    heading: string;
    body: string;
    bullets?: string[];
  }>;
  questions?: Array<{
    question: string;
    whyLikely: string;
    recruiterTesting: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    label: string;
    href: string;
    helper: string;
  };
  related: Array<{
    label: string;
    href: string;
  }>;
};

export const hubLabels: Record<SeoHub, string> = {
  "interview-prep": "Interview Prep",
  "career-transitions": "Career Transitions",
  "resume-help": "Resume Help",
  "cover-letters": "Cover Letters",
  "job-guides": "Job Guides",
  "recruiter-insights": "Recruiter Insights"
};

export const seoPages: SeoPage[] = [
  {
    hub: "interview-prep",
    slug: "account-manager-interview-questions",
    title: "Account Manager Interview Questions",
    description:
      "Prepare for account manager interviews with recruiter-style questions, what hiring managers are testing, and a free preview from Career Ladder.",
    eyebrow: "Recruiter-style interview prep",
    headline: "Account Manager interview questions that test real readiness.",
    intro:
      "Account Manager interviews usually test relationship ownership, follow-through, commercial judgment, and how clearly you can explain customer outcomes. The strongest preparation connects your real experience to the account work the role actually requires.",
    canonicalPath: "/interview-prep/account-manager-interview-questions",
    sections: [
      {
        heading: "What recruiters are really listening for",
        body:
          "Hiring teams are rarely looking for memorized answers. They want proof that you can manage relationships, keep commitments visible, navigate friction, and communicate account health before problems become surprises.",
        bullets: [
          "Customer or client communication under pressure",
          "Ownership of follow-up, renewals, onboarding, or issue resolution",
          "Comfort with CRM notes, pipeline hygiene, reporting, or account metrics",
          "Judgment around when to escalate and how to protect trust"
        ]
      },
      {
        heading: "How to prepare your examples",
        body:
          "Choose examples where you owned a customer outcome, coordinated across people, or turned vague needs into a clear next step. Even adjacent experience can work if you frame the business problem, your action, and the result clearly."
      }
    ],
    questions: [
      {
        question: "Tell me about a time you had to rebuild trust with a customer or stakeholder.",
        whyLikely: "Account roles depend on credibility when timelines, expectations, or outcomes shift.",
        recruiterTesting: "They are testing communication maturity, follow-through, and whether you take ownership without overpromising."
      },
      {
        question: "How do you keep track of account priorities when several customers need attention at once?",
        whyLikely: "Account managers need visible systems for prioritization and follow-up.",
        recruiterTesting: "They are looking for CRM discipline, organization, and judgment around urgency versus importance."
      },
      {
        question: "Walk me through how you would identify an expansion or retention risk.",
        whyLikely: "Many account roles blend service, commercial awareness, and early risk detection.",
        recruiterTesting: "They want to hear how you read signals, ask questions, and communicate next steps."
      }
    ],
    faq: [
      {
        question: "How should I prepare for an Account Manager interview?",
        answer:
          "Prepare examples around customer communication, follow-up, conflict resolution, account health, reporting, and measurable outcomes. Tie each example to the job posting whenever possible."
      },
      {
        question: "Can transferable experience work for Account Manager roles?",
        answer:
          "Yes. Retail, hospitality, operations, sales support, customer service, and project coordination can all translate if you show relationship ownership, prioritization, and business impact."
      },
      {
        question: "What is the best way to answer behavioral account management questions?",
        answer:
          "Use a STAR structure, but keep it conversational: situation, task, action, result, and what you learned about managing customer trust."
      }
    ],
    cta: {
      label: "Generate recruiter-style interview prep",
      href: "/?step=intake",
      helper: "Paste the actual posting to get questions and prep notes built around the role."
    },
    related: [
      { label: "How to tailor a resume for a job posting", href: "/resume-help/how-to-tailor-a-resume-for-a-job-posting" },
      { label: "Retail to customer success", href: "/career-transitions/retail-to-customer-success" },
      { label: "What recruiters look for in a resume", href: "/recruiter-insights/what-recruiters-look-for-in-a-resume" }
    ]
  },
  {
    hub: "resume-help",
    slug: "how-to-tailor-a-resume-for-a-job-posting",
    title: "How to Tailor a Resume for a Job Posting",
    description:
      "A recruiter-aware guide to tailoring your resume around the real requirements and evidence in a job posting.",
    eyebrow: "Resume help",
    headline: "Tailor your resume around the hiring signal, not keyword stuffing.",
    intro:
      "A strong tailored resume translates your real experience into the language and proof the role requires. It should stay truthful, readable, and focused on recruiter decision-making.",
    canonicalPath: "/resume-help/how-to-tailor-a-resume-for-a-job-posting",
    sections: [
      {
        heading: "Start with the role, then choose evidence",
        body:
          "Read the posting for responsibilities, tools, scope, customer type, metrics, and collaboration patterns. Then choose resume evidence that proves those signals.",
        bullets: [
          "Separate real requirements from company boilerplate",
          "Map your experience to responsibilities, not just nouns",
          "Use metrics only when they are truthful and useful"
        ]
      }
    ],
    faq: [
      {
        question: "Should I tailor every resume?",
        answer:
          "For roles you care about, yes. Tailoring helps recruiters see the evidence that matches the posting more quickly."
      }
    ],
    cta: {
      label: "Analyze my resume against a posting",
      href: "/?step=intake",
      helper: "Start with the target role and choose resume tailoring."
    },
    related: [
      { label: "Account Manager interview questions", href: "/interview-prep/account-manager-interview-questions" },
      { label: "What recruiters look for in a resume", href: "/recruiter-insights/what-recruiters-look-for-in-a-resume" }
    ]
  },
  {
    hub: "career-transitions",
    slug: "retail-to-customer-success",
    title: "Retail to Customer Success",
    description:
      "How retail experience can translate into customer success, account support, onboarding, and client-facing SaaS roles.",
    eyebrow: "Career transitions",
    headline: "Retail experience can translate into customer success when the proof is framed clearly.",
    intro:
      "Retail work often builds customer communication, conflict resolution, prioritization, and follow-through. The transition challenge is showing how those strengths map to recurring customer workflows.",
    canonicalPath: "/career-transitions/retail-to-customer-success",
    sections: [
      {
        heading: "Transferable strengths to surface",
        body:
          "Use examples that show ownership, customer trust, product explanation, service recovery, and coordination across busy shifts or teams.",
        bullets: [
          "Customer issue diagnosis and follow-through",
          "Training, onboarding, or coaching newer team members",
          "Handling competing priorities without losing service quality"
        ]
      }
    ],
    faq: [
      {
        question: "Can retail experience help me get into customer success?",
        answer:
          "Yes, especially when you can show relationship management, communication, service recovery, and measurable customer outcomes."
      }
    ],
    cta: {
      label: "Compare my transferable skills",
      href: "/?step=intake",
      helper: "Use Career Pathway to identify strengths and gaps."
    },
    related: [
      { label: "How to tailor a resume for a job posting", href: "/resume-help/how-to-tailor-a-resume-for-a-job-posting" },
      { label: "Account Manager interview questions", href: "/interview-prep/account-manager-interview-questions" }
    ]
  },
  {
    hub: "recruiter-insights",
    slug: "what-recruiters-look-for-in-a-resume",
    title: "What Recruiters Look For in a Resume",
    description:
      "Understand how recruiters scan resumes for role fit, proof, clarity, and credible alignment with a job posting.",
    eyebrow: "Recruiter insights",
    headline: "Recruiters scan for credible role evidence before perfect wording.",
    intro:
      "Recruiters need to quickly understand whether your background lines up with the role's responsibilities, scope, tools, and outcomes. Clear positioning matters more than decorative language.",
    canonicalPath: "/recruiter-insights/what-recruiters-look-for-in-a-resume",
    sections: [
      {
        heading: "The first scan is about risk and evidence",
        body:
          "A recruiter is trying to answer whether you have done similar work, can learn the missing pieces, and can explain your impact clearly.",
        bullets: [
          "Relevant scope and responsibilities",
          "Recent or transferable proof",
          "Clear outcomes, tools, and work context"
        ]
      }
    ],
    faq: [
      {
        question: "Do recruiters read every resume carefully?",
        answer:
          "Not at first. Most start with a fast scan for role fit, clarity, and credible evidence before reading more closely."
      }
    ],
    cta: {
      label: "See how my experience reads",
      href: "/?step=intake",
      helper: "Paste a posting and choose the support you need."
    },
    related: [
      { label: "How to tailor a resume for a job posting", href: "/resume-help/how-to-tailor-a-resume-for-a-job-posting" },
      { label: "Account Manager interview questions", href: "/interview-prep/account-manager-interview-questions" }
    ]
  }
];

export function getSeoPage(hub: SeoHub, slug: string) {
  return seoPages.find((page) => page.hub === hub && page.slug === slug);
}

export function pagesForHub(hub: SeoHub) {
  return seoPages.filter((page) => page.hub === hub);
}
