"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  BookOpenCheck,
  Eye,
  FileText,
  GraduationCap,
  Plus,
  School,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    text: "Your data is protected with enterprise-grade security.",
  },
  {
    icon: FileText,
    title: "Efficient & Organized",
    text: "Track requirements, submissions, and approvals in real-time.",
  },
  {
    icon: UsersRound,
    title: "Built for Schools",
    text: "Designed to support School Contacts and Administrators.",
  },
];

const defaultOfferings: string[] = [];

export default function PlatformRegisterPage() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [offerings, setOfferings] = useState(defaultOfferings);
  const [offeringInput, setOfferingInput] = useState("");

  function addOffering() {
    const nextOffering = offeringInput.trim();

    if (!nextOffering) {
      return;
    }

    setOfferings((current) => {
      if (current.some((offering) => offering.toLowerCase() === nextOffering.toLowerCase())) {
        return current;
      }

      return [...current, nextOffering];
    });
    setOfferingInput("");
  }

  function removeOffering(offeringToRemove: string) {
    setOfferings((current) => current.filter((offering) => offering !== offeringToRemove));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setSubmitState("error");
      setMessage("Password and confirm password must match.");
      return;
    }

    const payload = {
      schoolName: String(formData.get("schoolName") ?? ""),
      schoolDistrict: String(formData.get("schoolDistrict") ?? ""),
      schoolAddress: String(formData.get("schoolAddress") ?? ""),
      representativeName: String(formData.get("representativeName") ?? ""),
      representativePosition: String(formData.get("representativePosition") ?? ""),
      representativeEmail: String(formData.get("representativeEmail") ?? ""),
      contactNumber: String(formData.get("contactNumber") ?? ""),
      schoolOfferings: offerings,
    };

    try {
      const response = await fetch("/api/platform/school-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to submit registration.");
      }

      form.reset();
      setOfferings(defaultOfferings);
      setOfferingInput("");
      setSubmitState("success");
      setMessage("Registration request submitted. The admin has been notified for approval.");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit registration.");
    }
  }

  return (
    <main className="school-register-page">
      <section className="school-register-intro">
        <div className="school-register-brand">
          <span>
            <GraduationCap aria-hidden="true" size={44} />
            <BookOpenCheck aria-hidden="true" size={54} />
          </span>
          <div>
            <strong>SMME</strong>
            <small>
              School Monitoring &
              <br />
              Management Ecosystem
            </small>
          </div>
        </div>

        <div className="school-register-copy">
          <h1>
            Register Your School.
            <br />
            <span>Simplify Compliance.</span>
            <br />
            <span>Strengthen Education.</span>
          </h1>
          <span className="school-register-line" />
          <p>
            Join the SMME platform to monitor, manage, and streamline school permits,
            requirements, and submissions in one secure system.
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

        <div className="school-register-photo-card">
          <UsersRound aria-hidden="true" size={42} />
          <strong>Together, let&apos;s build a stronger foundation for education.</strong>
        </div>
      </section>

      <section className="school-register-form-wrap">
        <div className="school-register-card">
          <div className="school-register-card-head">
            <span>
              <School aria-hidden="true" size={42} />
            </span>
            <h2>Create an Account</h2>
            <p>Register your school to get started with SMME.</p>
          </div>

          <form className="school-register-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>School Information</legend>
              <label className="school-register-wide">
                <span>School Name *</span>
                <input name="schoolName" type="text" placeholder="Enter school name" required />
              </label>
              <label className="school-register-wide">
                <span>District *</span>
                <input
                  name="schoolDistrict"
                  type="text"
                  placeholder="Enter district"
                  required
                />
              </label>
              <label className="school-register-wide">
                <span>School Address *</span>
                <input
                  name="schoolAddress"
                  type="text"
                  placeholder="Enter complete school address"
                  required
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Offerings &amp; Services</legend>
              <div className="school-register-offerings school-register-wide">
                <div className="school-register-offering-entry">
                  <input
                    aria-label="Offering or service"
                    type="text"
                    placeholder="Add offering or service"
                    value={offeringInput}
                    onChange={(event) => setOfferingInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addOffering();
                      }
                    }}
                  />
                  <button type="button" onClick={addOffering}>
                    <Plus aria-hidden="true" size={18} />
                    Add
                  </button>
                </div>
                <div className="school-register-offering-list">
                  {offerings.map((offering) => (
                    <div key={offering}>
                      <span>{offering}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${offering}`}
                        onClick={() => removeOffering(offering)}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>School Contact Information</legend>
              <label>
                <span>Full Name *</span>
                <input
                  name="representativeName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                />
              </label>
              <label>
                <span>Position / Designation *</span>
                <input
                  name="representativePosition"
                  type="text"
                  placeholder="Enter your position"
                  required
                />
              </label>
              <label>
                <span>Email Address *</span>
                <input
                  name="representativeEmail"
                  type="email"
                  placeholder="Enter your official email"
                  required
                />
              </label>
              <label>
                <span>Mobile Number *</span>
                <input name="contactNumber" type="tel" placeholder="09XX XXX XXXX" required />
              </label>
            </fieldset>

            <fieldset>
              <legend>Account Security</legend>
              <label>
                <span>Password *</span>
                <span className="school-register-password">
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    minLength={8}
                    required
                  />
                  <Eye aria-hidden="true" size={18} />
                </span>
              </label>
              <label>
                <span>Confirm Password *</span>
                <span className="school-register-password">
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    minLength={8}
                    required
                  />
                  <Eye aria-hidden="true" size={18} />
                </span>
              </label>
              <p className="school-register-help">
                Password must be at least 8 characters and include uppercase, lowercase,
                number, and special character.
              </p>
            </fieldset>

            <label className="school-register-terms">
              <input type="checkbox" required />
              <span>
                I agree to the <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>
              </span>
            </label>

            {message ? (
              <p className={`school-register-message ${submitState}`}>{message}</p>
            ) : null}

            <button className="school-register-submit" type="submit" disabled={submitState === "submitting"}>
              <UserRoundPlus aria-hidden="true" size={21} />
              {submitState === "submitting" ? "Registering..." : "Register School"}
            </button>

            <p className="school-register-login">
              Already have an account? <Link href="/platform/login">Sign in here</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
