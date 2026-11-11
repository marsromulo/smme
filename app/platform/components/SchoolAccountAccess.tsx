"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SchoolAccountAccess({ userId, initialActive }: { userId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function save(next: boolean) {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/platform/school-accounts/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: next }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update access.");
      setActive(result.active);
      setMessage(next ? "Account activated. Registration approval is still required to sign in." : "Account deactivated. School access is blocked, including existing sessions on their next request.");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update access."); }
    finally { setSaving(false); }
  }
  return <section className="platform-section">
    <div className="platform-section-head compact"><h2>School Account Access</h2></div>
    <label>Account status <select value={active ? "active" : "inactive"} disabled={saving} onChange={(event) => void save(event.target.value === "active")}>
      <option value="active">Active</option><option value="inactive">Inactive</option>
    </select></label>
    <p>Inactive accounts cannot access the platform, even with an approved registration.</p>
    {saving ? <p role="status">Saving…</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
