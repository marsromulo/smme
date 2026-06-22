import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Send,
  UserRound,
} from "lucide-react";

export default function PlatformRegisterPage() {
  return (
    <main className="platform-auth register">
      <section className="platform-auth-panel">
        <Link className="platform-back-link" href="/platform/login">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to login
        </Link>
        <div className="platform-auth-brand">
          <Image
            src="/assets/logos/sdobc-smme-logo.png"
            alt="SMME logo"
            width={78}
            height={78}
            priority
          />
          <div>
            <span>School representative access</span>
            <strong>Registration</strong>
          </div>
        </div>
        <div className="platform-auth-copy">
          <span className="platform-kicker">Account request</span>
          <h1>Register School Account</h1>
          <p>Static request form for school users who will submit documents and track reviews.</p>
        </div>
        <form className="platform-auth-form two-column-form">
          <label>
            <span>School name</span>
            <div>
              <Building2 aria-hidden="true" size={18} />
              <input type="text" placeholder="Official school name" />
            </div>
          </label>
          <label>
            <span>School ID</span>
            <div>
              <CheckCircle2 aria-hidden="true" size={18} />
              <input type="text" placeholder="SMME-BC-000" />
            </div>
          </label>
          <label>
            <span>Representative</span>
            <div>
              <UserRound aria-hidden="true" size={18} />
              <input type="text" placeholder="Full name" />
            </div>
          </label>
          <label>
            <span>Email address</span>
            <div>
              <Mail aria-hidden="true" size={18} />
              <input type="email" placeholder="name@school.edu.ph" />
            </div>
          </label>
          <label className="platform-form-wide">
            <span>Contact number</span>
            <div>
              <Phone aria-hidden="true" size={18} />
              <input type="tel" placeholder="Contact number" />
            </div>
          </label>
          <button className="platform-btn primary wide platform-form-wide" type="button">
            <Send aria-hidden="true" size={18} />
            Submit Request
          </button>
        </form>
      </section>
      <section className="platform-auth-visual" aria-label="School registration preview">
        <div>
          <span>School onboarding</span>
          <strong>Prepare verified school access for future submissions</strong>
          <p>Profiles, representatives, and account approval will be wired to the database later.</p>
        </div>
      </section>
    </main>
  );
}
