import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminProfileForm } from "../../components/AdminProfileForm";
import { SchoolProfileForm } from "../../components/SchoolProfileForm";

type SchoolProfile = {
  contact_number: string | null;
  representative_email: string;
  representative_name: string;
  representative_position: string | null;
  school_address: string | null;
  school_district: string | null;
  school_id: string | null;
  school_name: string;
  school_offerings: string[] | null;
  school_type: string | null;
  status: string;
};

function readableNameFromEmail(email: string | null) {
  if (!email) {
    return "Admin User";
  }

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "Admin User";
  }

  return localPart
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function getAdminDisplayName(userId: string | null, fallbackEmail: string | null, fallbackName: string | null) {
  if (!userId) {
    return fallbackName ?? readableNameFromEmail(fallbackEmail);
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.display_name?.trim() || fallbackName || readableNameFromEmail(fallbackEmail);
}

async function getSchoolProfile(email: string | null): Promise<SchoolProfile | null> {
  if (!email) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: schools } = await supabase
    .from("schools")
    .select(
      "school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_position, representative_email, contact_number, status",
    )
    .eq("representative_email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (schools?.[0]) {
    return schools[0] as SchoolProfile;
  }

  const { data: registrations } = await supabase
    .from("school_registration_requests")
    .select(
      "school_name, school_id, school_type, school_district, school_address, school_offerings, representative_name, representative_position, representative_email, contact_number, status",
    )
    .eq("representative_email", email)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);

  return (registrations?.[0] as SchoolProfile | undefined) ?? null;
}

export default async function PlatformProfilePage() {
  const session = await getPlatformSession();
  const isAdmin = session.role === "admin";
  const title = isAdmin ? "Admin Profile" : "School Profile";

  if (isAdmin) {
    const displayName = await getAdminDisplayName(session.userId, session.email, session.name);

    return (
      <main className="platform-page">
        <section className="platform-page-head">
          <div>
            <span className="platform-kicker">Profile</span>
            <h1>{title}</h1>
            <p>Update the admin name used in review history and the workspace header.</p>
          </div>
        </section>

        <section className="platform-grid profile">
          <article className="platform-section">
            <div className="platform-section-head compact">
              <div>
                <span className="platform-kicker">Administrator</span>
                <h2>Display Name</h2>
              </div>
            </div>
            <AdminProfileForm initialDisplayName={displayName} />
          </article>
        </section>
      </main>
    );
  }

  const school = await getSchoolProfile(session.email);

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">Profile</span>
          <h1>{title}</h1>
          <p>Update the school and representative information connected to your account.</p>
        </div>
      </section>

      <section className="platform-grid profile">
        <article className="platform-section">
          <div className="platform-section-head compact">
            <div>
              <span className="platform-kicker">School record</span>
              <h2>{school?.school_name ?? "School Information"}</h2>
            </div>
          </div>
          {school ? (
            <SchoolProfileForm
              initialValue={{
                contactNumber: school.contact_number ?? "",
                representativeEmail: school.representative_email,
                representativeName: school.representative_name,
                representativePosition: school.representative_position ?? "",
                schoolAddress: school.school_address ?? "",
                schoolDistrict: school.school_district ?? "",
                schoolId: school.school_id ?? "",
                schoolName: school.school_name,
                schoolOfferings: school.school_offerings ?? [],
                schoolType: school.school_type ?? "",
              }}
            />
          ) : (
            <p className="platform-document-empty">No school profile is connected to this account yet.</p>
          )}
        </article>
      </section>
    </main>
  );
}
