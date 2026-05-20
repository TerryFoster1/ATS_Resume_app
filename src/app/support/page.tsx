import LegalPage from "@/components/LegalPage";

export default function SupportPage() {
  return (
    <LegalPage
      label="Support"
      title="Need help with your application materials?"
      intro="We want Career Ladder to feel reliable and clear, especially when you are preparing for an important role."
      sections={[
        {
          heading: "Contact",
          body: "Email support@careerladder.ca with your account email, the role you were working on, and a short description of the issue."
        },
        {
          heading: "Payment or credits",
          body: "For payment issues, include the approximate purchase time and credit pack. Do not send full card numbers or sensitive payment details."
        },
        {
          heading: "Generated materials",
          body: "If an output looks wrong, tell us what felt inaccurate or unhelpful. AI-generated materials should always be reviewed before submission."
        },
        {
          heading: "Response time",
          body: "During early launch, support is handled manually. We will prioritize access, payment, and saved-output issues first."
        }
      ]}
    />
  );
}
