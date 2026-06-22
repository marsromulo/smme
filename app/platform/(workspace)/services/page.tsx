import Link from "next/link";
import { getPlatformSession } from "@/lib/platform/auth";
import { ServicesMaintenanceClient } from "../../components/ServicesMaintenanceClient";

export default async function ServiceMaintenancePage() {
  const session = await getPlatformSession();
  const isAdmin = session.role === "admin";

  if (!isAdmin) {
    return (
      <main className="platform-page">
        <section className="platform-page-head">
          <div>
            <span className="platform-kicker">Restricted</span>
            <h1>Services</h1>
            <p>This module is available to administrators only.</p>
          </div>
          <Link className="platform-btn primary" href="/platform">
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return <ServicesMaintenanceClient />;
}
