import Link from "next/link";

export default function PlatformPrivacyPage() {
  return (
    <main className="platform-legal-page">
      <section className="platform-legal-card">
        <span className="platform-kicker">SMME Platform</span>
        <h1>Privacy Policy</h1>
        <p>
          This privacy policy explains how the SMME Platform generally handles
          school registration details, representative contact information, service
          applications, uploaded documents, review notes, and platform notifications.
        </p>

        <h2>Information Collected</h2>
        <p>
          The platform may collect school profile information, representative names,
          positions, email addresses, contact numbers, submitted documents, document
          review status, and account activity needed to process school requests.
        </p>

        <h2>How Information Is Used</h2>
        <p>
          Information is used to register schools, manage service applications,
          review required documents, send notifications, and keep an administrative
          record of submitted requirements and review decisions.
        </p>

        <h2>Access and Protection</h2>
        <p>
          Access to school information is limited to authorized users based on their
          role. Schools can view their own submissions and notifications, while
          administrators can review records needed for platform operations.
        </p>

        <h2>Data Accuracy</h2>
        <p>
          Schools should keep submitted information accurate and notify the SMME
          administrator if important registration or contact details need correction.
        </p>

        <Link className="platform-legal-back" href="/platform/register">
          Back to Registration
        </Link>
      </section>
    </main>
  );
}
