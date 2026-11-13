import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform/auth";
import { getApprovedSchoolRecordBySlug } from "@/app/platform/school-records";
import { getSchool } from "@/app/platform/data";
import { getSchoolApplications } from "@/app/platform/school-applications";
import { SchoolApplicationsPanel } from "@/app/platform/components/SchoolApplicationsPanel";

export default async function SchoolApplicationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getPlatformSession();
  if (!session.userId) redirect("/platform/login");
  if (session.role !== "admin") notFound();
  const { slug } = await params;
  const school = await getApprovedSchoolRecordBySlug(slug) ?? getSchool(slug);
  if (!school) notFound();
  const applications = await getSchoolApplications(school.contact);
  return <main className="platform-page">
    <Link className="platform-back-link" href={`/platform/schools/${slug}`}>Back to {school.name}</Link>
    <section className="platform-page-head"><div><h1>{school.name} — Applications</h1><p>Review this school’s applications and submitted documents.</p></div></section>
    <SchoolApplicationsPanel applications={applications} />
  </main>;
}
