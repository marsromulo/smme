"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, KeyRound, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import sgodLogo from "@/layout/sgod_logo.png";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const hasValidParameters = Boolean(tokenHash) && searchParams.get("type") === "recovery";
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(
    hasValidParameters ? "" : "This password reset link is invalid or incomplete.",
  );
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!tokenHash || !hasValidParameters) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: "recovery" })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setError("This password reset link is invalid or has expired. Request a new link.");
          return;
        }

        setIsReady(true);
      });
  }, [hasValidParameters, tokenHash]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();
      setIsComplete(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update your password.");
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
          <h1>Secure your account.<br /><span>Choose a new password.</span></h1>
          <span className="school-register-line" />
          <p>Use a strong password that you do not use for another account.</p>
        </div>
      </section>

      <section className="school-login-form-wrap">
        <div className="school-login-card password-recovery-card">
          <div className="school-login-card-head">
            <span><Building2 aria-hidden="true" size={44} /></span>
            <h2>{isComplete ? "Password Updated" : "Reset Password"}</h2>
            <p>{isComplete ? "You can now sign in using your new password." : "Enter and confirm your new account password."}</p>
          </div>
          {isComplete ? (
            <Link className="school-login-submit password-login-link" href="/platform/login">
              Sign In to SMME
            </Link>
          ) : (
            <form className="school-login-form" onSubmit={handleSubmit}>
              <label>
                <span>New Password</span>
                <div>
                  <LockKeyhole aria-hidden="true" size={22} />
                  <input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={!isReady} />
                </div>
              </label>
              <label>
                <span>Confirm New Password</span>
                <div>
                  <KeyRound aria-hidden="true" size={22} />
                  <input name="confirmation" type="password" autoComplete="new-password" minLength={8} required disabled={!isReady} />
                </div>
              </label>
              {error ? <p className="school-login-error">{error}</p> : null}
              <button className="school-login-submit" type="submit" disabled={!isReady || isSubmitting}>
                <KeyRound aria-hidden="true" size={21} />
                {isSubmitting ? "Updating..." : isReady ? "Update Password" : "Validating Link..."}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
