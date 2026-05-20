import LegalPage from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Privacy Policy"
      title="How Career Ladder handles your information"
      intro="Career Ladder uses your resume, job descriptions, answers, and generated materials only to provide the resume positioning workflow you request."
      sections={[
        {
          heading: "Information we collect",
          body: "We collect account details, uploaded or pasted resume content, job descriptions, clarification answers, generated resumes and cover letters, credit purchases, and basic product usage data."
        },
        {
          heading: "How we use it",
          body: "We use this information to analyze role alignment, generate application materials, save your outputs, support account access, process unlocks, and improve product reliability."
        },
        {
          heading: "Payments",
          body: "Payments are handled by Stripe Checkout. Career Ladder does not store full payment card numbers. Stripe may process payment details according to its own policies."
        },
        {
          heading: "AI-generated outputs",
          body: "The app uses AI services to help transform your materials. You should review generated resumes and cover letters for accuracy before using them."
        },
        {
          heading: "Support",
          body: "For privacy or account questions, contact support@careerladder.ca."
        }
      ]}
    />
  );
}
