"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Save } from "lucide-react";

export function AdminProfileForm({
  initialDisplayName,
}: {
  initialDisplayName: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/platform/profile/admin", {
        body: JSON.stringify({ displayName }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as { displayName?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update admin profile.");
      }

      setDisplayName(result.displayName ?? displayName.trim());
      setMessage("Profile updated.");
      router.refresh();
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to update admin profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="platform-profile-form" onSubmit={handleSubmit}>
      <label>
        <span>Admin Name</span>
        <input
          name="displayName"
          type="text"
          value={displayName}
          required
          onChange={(event) => {
            setDisplayName(event.target.value);
            setError("");
            setMessage("");
          }}
        />
      </label>

      {error ? <p className="platform-form-message error">{error}</p> : null}
      {message ? <p className="platform-form-message success">{message}</p> : null}

      <div className="platform-form-actions">
        <button className="platform-btn primary" type="submit" disabled={isSaving}>
          <Save aria-hidden="true" size={17} />
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
