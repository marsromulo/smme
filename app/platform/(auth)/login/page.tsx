"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Eye, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const role = username.trim().toLowerCase();

    if (role !== "admin" && role !== "school") {
      setError('Use "admin" or "school" as the username.');
      return;
    }

    window.localStorage.setItem("smme-platform-role", role);
    router.push("/platform");
  }

  return (
    <main className="platform-auth">
      <section className="platform-auth-panel">
        <Link className="platform-back-link" href="/">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to SMME site
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
            <span>Schools Division of Baguio City</span>
            <strong>M&E Platform</strong>
          </div>
        </div>
        <div className="platform-auth-copy">
          <span className="platform-kicker">Secure access</span>
          <h1>Login</h1>
          <p>Access school applications, document reviews, and monitoring records.</p>
        </div>
        <form className="platform-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <div>
              <Mail aria-hidden="true" size={18} />
              <input
                type="text"
                placeholder="admin or school"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
              />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div>
              <LockKeyhole aria-hidden="true" size={18} />
              <input type="password" placeholder="Enter password" />
              <Eye aria-hidden="true" size={18} />
            </div>
          </label>
          {error ? <p className="platform-auth-error">{error}</p> : null}
          <button className="platform-btn primary wide" type="submit">
            <ShieldCheck aria-hidden="true" size={18} />
            Sign In
          </button>
        </form>
        <div className="platform-auth-footer">
          <Link href="/platform/register">Request an account</Link>
          <Link href="/platform">Continue to static preview</Link>
        </div>
      </section>
      <section className="platform-auth-visual" aria-label="SMME platform preview">
        <div>
          <span>SY 2026-2027</span>
          <strong>Review queue and school compliance workspace</strong>
          <p>Static prototype only. Authentication and database logic will be connected later.</p>
        </div>
      </section>
    </main>
  );
}
