import LegalPage from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      label="Terms of Service"
      title="Terms for using Career Ladder"
      intro="Career Ladder is a career positioning tool that helps tailor application materials based on information you provide."
      sections={[
        {
          heading: "Your responsibility",
          body: "You are responsible for reviewing generated materials and ensuring they are accurate, truthful, and appropriate for each application."
        },
        {
          heading: "No hiring guarantee",
          body: "Career Ladder does not guarantee interviews, job offers, recruiter responses, ATS outcomes, or employer decisions."
        },
        {
          heading: "Account use",
          body: "Keep your account access secure. Saved outputs, credits, and unlocks are tied to the account used in the app."
        },
        {
          heading: "Acceptable use",
          body: "Do not use the app to create misleading, fraudulent, harmful, or unlawful materials."
        },
        {
          heading: "Changes",
          body: "These terms may be updated as the product evolves. Continued use means you accept the current terms."
        }
      ]}
    />
  );
}
