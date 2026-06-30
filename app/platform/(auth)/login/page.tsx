"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Building2,
  Eye,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import sgodLogo from "@/layout/sgod_logo.png";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure & Trusted",
    text: "Enterprise-grade security to keep your data safe and confidential.",
  },
  {
    icon: FileText,
    title: "Efficient & Transparent",
    text: "Real-time tracking of submissions, reviews, and approvals.",
  },
  {
    icon: UsersRound,
    title: "Built for Education",
    text: "Designed for Schools, School Contacts, and Administrators.",
  },
];

const accessNotes = [
  { icon: ShieldCheck, title: "Secure Access", text: "Your data is protected" },
  { icon: UsersRound, title: "Role-Based Access", text: "Access what you need" },
  { icon: FileText, title: "Audit & Compliance", text: "Track every action" },
];

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/platform");
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="school-login-page">
      <section className="school-login-intro">
        <div className="school-register-brand">
          <Image className="school-register-logo" src={sgodLogo} alt="SGOD logo" width={76} height={76} priority />
          <div>
            <strong>SMME</strong>
            <small>
              School Management
              <br />
              Monitoring and Evaluation
            </small>
          </div>
        </div>

        <div className="school-register-copy school-login-copy">
          <h1>
            Smart Monitoring.
            <br />
            Secure Management.
            <br />
            <span>Stronger Schools.</span>
          </h1>
          <span className="school-register-line" />
          <p>
            SMME helps Schools and Administrators streamline permit submissions, track
            requirements, and ensure compliance in one secure platform.
          </p>
        </div>

        <div className="school-register-features">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title}>
                <span>
                  <Icon aria-hidden="true" size={26} />
                </span>
                <div>
                  <strong>{feature.title}</strong>
                  <p>{feature.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="school-register-photo-card school-login-photo-card">
          <UsersRound aria-hidden="true" size={42} />
          <strong>Together, let&apos;s build a stronger foundation for education.</strong>
        </div>
      </section>

      <section className="school-login-form-wrap">
        <div className="school-login-card">
          <div className="school-login-card-head">
            <span>
              <Building2 aria-hidden="true" size={44} />
            </span>
            <h2>Welcome Back!</h2>
            <p>Sign in to continue to your SMME account.</p>
          </div>

          <form className="school-login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email Address</span>
              <div>
                <Mail aria-hidden="true" size={22} />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  required
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div>
                <LockKeyhole aria-hidden="true" size={22} />
                <input name="password" type="password" placeholder="Enter your password" required />
                <Eye aria-hidden="true" size={22} />
              </div>
            </label>

            <div className="school-login-options">
              <label>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#">Forgot Password?</a>
            </div>

            {error ? <p className="school-login-error">{error}</p> : null}

            <button className="school-login-submit" type="submit" disabled={isSubmitting}>
              <UserRound aria-hidden="true" size={21} />
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="school-login-divider">
            <span>or</span>
          </div>

          <button className="school-login-sso" type="button">
            <ShieldCheck aria-hidden="true" size={23} />
            Sign in with SSO
          </button>

          <p className="school-login-register">
            Don&apos;t have an account? <Link href="/platform/register">Register your school</Link>
          </p>
        </div>

        <div className="school-login-assurance">
          {accessNotes.map((note) => {
            const Icon = note.icon;

            return (
              <div key={note.title}>
                <span>
                  <Icon aria-hidden="true" size={25} />
                </span>
                <div>
                  <strong>{note.title}</strong>
                  <p>{note.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
