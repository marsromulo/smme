import { getSchoolApplications } from "@/app/platform/school-applications";
import { SchoolApplicationsPanel } from "@/app/platform/components/SchoolApplicationsPanel";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/app/api/platform/school-registrations/auth-users";
import { SchoolAccountAccess } from "@/app/platform/components/SchoolAccountAccess";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
} from "lucide-react";
import { getSchool, schools } from "../../../data";
import { getApprovedSchoolRecordBySlug } from "../../../school-records";

import { SchoolStatusDetails } from "../../../components/SchoolStatusDetails";

import { SchoolOwnerDetails } from "@/app/platform/components/SchoolOwnerDetails";

export function generateStaticParams() {
  return schools.map((school) => ({ slug: school.slug }));
}

export default async function PlatformSchoolDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getPlatformSession();
  if (!session.userId) redirect("/platform/login");
  if (session.role !== "admin") notFound();
  const { slug } = await params;
  let school = getSchool(slug);

  if (!school) {
    try {
      school = (await getApprovedSchoolRecordBySlug(slug)) ?? undefined;
    } catch {
      school = undefined;
    }
  }

  if (!school) {
    notFound();
  }

  const applications = await getSchoolApplications(school.contact);
  const account = session.role === "admin" && session.userId
    ? await findAuthUserByEmail(createSupabaseAdminClient(), school.contact)
    : null;

  return (
    <main className="platform-page">
      <Link className="platform-back-link" href="/platform/schools">
        <ArrowLeft aria-hidden="true" size={16} />
        Back to schools
      </Link>

      <section className="platform-detail-hero">
        <div>
          <h1>{school.name}</h1>
          <div className="platform-detail-actions">
            <Link className="platform-btn primary" href="#school-documents">
              <FileText aria-hidden="true" size={18} />Review Documents
            </Link>
            <Link className="platform-btn secondary" href={`/platform/schools/${slug}/applications`}>
              <Clock3 aria-hidden="true" size={18} />
              View Applications
            </Link>
          </div>
        </div>
        <div className="platform-compliance-meter">
          <strong>{school.compliance}%</strong>
          <span>Compliance score</span>
          <div className="platform-progress">
            <span style={{ width: `${school.compliance}%` }} />
          </div>
        </div>
      </section>

      <section className="platform-grid detail">
        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Profile</span>
              <h2>School Information</h2>
            </div>
          </div>
          <dl className="platform-detail-list">
            <div>
              <dt>
                <Building2 aria-hidden="true" size={17} />
                District
              </dt>
              <dd>{school.district}</dd>
            </div>
            <div>
              <dt>
                <MapPin aria-hidden="true" size={17} />
                Address
              </dt>
              <dd>{school.address}</dd>
            </div>
            <div>
              <dt>
                <Mail aria-hidden="true" size={17} />
                Contact
              </dt>
              <dd>{school.contact}</dd>
            </div>
          </dl>
          <SchoolOwnerDetails school={school.ownerDetails ?? { representative_name: school.principal }} />
        </article>

        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">Programs</span>
              <h2>Curriculum Offerings</h2>
            </div>
          </div>
          <div className="platform-tag-list">
            {school.programs.map((program) => (
              <span key={program}>{program}</span>
            ))}
          </div>
          <div className="platform-service-list">
            {school.services.map((service) => (
              <div key={service}>
                <CheckCircle2 aria-hidden="true" size={17} />
                {service}
              </div>
            ))}
          </div>
        </article>
      </section>

      {account && "user" in account && account.user?.app_metadata.role === "school" ? (
        <SchoolAccountAccess userId={account.user.id} initialActive={account.user.app_metadata.account_active !== false} />
      ) : null}

      <SchoolStatusDetails value={school.schoolStatuses} />

      <SchoolApplicationsPanel applications={applications} />
    </main>
  );
}
