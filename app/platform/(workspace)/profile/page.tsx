import {
  BookOpenCheck,
  Building2,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminProfileForm } from "../../components/AdminProfileForm";

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

function fieldValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function formatOfferings(offerings: string[] | null) {
  return offerings?.length ? offerings.join(", ") : "Not provided";
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

function SchoolProfileDetails({ school }: { school: SchoolProfile }) {
  return (
    <div className="platform-registration-detail-list profile">
      <div>
        <Building2 aria-hidden="true" size={18} />
        <span>School Name</span>
        <strong>{school.school_name}</strong>
      </div>
      <div>
        <IdCard aria-hidden="true" size={18} />
        <span>School ID</span>
        <strong>{fieldValue(school.school_id)}</strong>
      </div>
      <div>
        <Building2 aria-hidden="true" size={18} />
        <span>School Type</span>
        <strong>{fieldValue(school.school_type)}</strong>
      </div>
      <div>
        <MapPin aria-hidden="true" size={18} />
        <span>District</span>
        <strong>{fieldValue(school.school_district)}</strong>
      </div>
      <div>
        <MapPin aria-hidden="true" size={18} />
        <span>Address</span>
        <strong>{fieldValue(school.school_address)}</strong>
      </div>
      <div>
        <BookOpenCheck aria-hidden="true" size={18} />
        <span>Offerings</span>
        <strong>{formatOfferings(school.school_offerings)}</strong>
      </div>
      <div>
        <UserRound aria-hidden="true" size={18} />
        <span>Representative</span>
        <strong>{school.representative_name}</strong>
      </div>
      <div>
        <ShieldCheck aria-hidden="true" size={18} />
        <span>Position</span>
        <strong>{fieldValue(school.representative_position)}</strong>
      </div>
      <div>
        <Mail aria-hidden="true" size={18} />
        <span>Email</span>
        <strong>{school.representative_email}</strong>
      </div>
      <div>
        <Phone aria-hidden="true" size={18} />
        <span>Contact Number</span>
        <strong>{fieldValue(school.contact_number)}</strong>
      </div>
    </div>
  );
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
          <p>View the school registration information connected to your account.</p>
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
            <SchoolProfileDetails school={school} />
          ) : (
            <p className="platform-document-empty">No school profile is connected to this account yet.</p>
          )}
        </article>
      </section>
    </main>
  );
}
