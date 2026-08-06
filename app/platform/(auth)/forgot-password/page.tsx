"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Building2, Mail, Send } from "lucide-react";
import sgodLogo from "@/layout/sgod_logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/platform/password/forgot", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to send the reset email.");
      }

      setMessage(result.message ?? "Check your inbox for a password reset link.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send the reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="school-login-page">
      <section className="school-login-intro password-recovery-intro">
        <div className="school-register-brand">
          <Image className="school-register-logo" src={sgodLogo} alt="SGOD logo" width={76} height={76} priority />
          <div>
            <strong>SMME</strong>
            <small>School Management<br />Monitoring and Evaluation</small>
          </div>
        </div>
        <div className="school-register-copy school-login-copy">
          <h1>Recover access.<br /><span>Return securely.</span></h1>
          <span className="school-register-line" />
          <p>We will send a secure, one-time password recovery link to your registered email address.</p>
        </div>
      </section>

      <section className="school-login-form-wrap">
        <div className="school-login-card password-recovery-card">
          <div className="school-login-card-head">
            <span><Building2 aria-hidden="true" size={44} /></span>
            <h2>Forgot Password?</h2>
            <p>Enter the email address connected to your SMME account.</p>
          </div>
          <form className="school-login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email Address</span>
              <div>
                <Mail aria-hidden="true" size={22} />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  required
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                />
              </div>
            </label>
            {error ? <p className="school-login-error">{error}</p> : null}
            {message ? <p className="school-login-success">{message}</p> : null}
            <button className="school-login-submit" type="submit" disabled={isSubmitting}>
              <Send aria-hidden="true" size={21} />
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <p className="school-login-register">
            <Link href="/platform/login"><ArrowLeft aria-hidden="true" size={16} /> Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
