import LegalPage from "@/components/LegalPage";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      label="Refund Policy"
      title="Credit purchases and refunds"
      intro="Credits unlock exports and premium material access. This policy keeps the purchase experience clear while the product is in early launch."
      sections={[
        {
          heading: "Unused credits",
          body: "If you purchased credits by mistake and have not used them, contact support@careerladder.ca and we will review the request."
        },
        {
          heading: "Used credits",
          body: "Credits used to unlock a resume export or cover letter are generally not refundable because the digital material is delivered immediately."
        },
        {
          heading: "Technical issues",
          body: "If a payment succeeds but credits do not appear, contact support with your account email and purchase time so we can investigate."
        },
        {
          heading: "Stripe processing",
          body: "Refunds, when approved, are processed through Stripe and may take several business days depending on the payment method."
        }
      ]}
    />
  );
}
