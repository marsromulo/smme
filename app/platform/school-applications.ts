import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/app/api/platform/school-registrations/auth-users";
import { getPlatformSession } from "@/lib/platform/auth";

export async function getSchoolApplications(email: string) {
  const session = await getPlatformSession();
  if (!session.userId || session.role !== "admin") throw new Error("Administrator access required.");
  const db = createSupabaseAdminClient();
  const [schoolsResult, account] = await Promise.all([
    db.from("schools").select("id").eq("representative_email", email),
    findAuthUserByEmail(db, email),
  ]);
  if (schoolsResult.error) throw new Error(schoolsResult.error.message);
  if (account.error) throw new Error(account.error.message);
  const schoolIds = (schoolsResult.data ?? []).map((school) => school.id);
  const filters = [
    ...(schoolIds.length ? [`school_id.in.(${schoolIds.join(",")})`] : []),
    ...(account.user ? [`school_user_id.eq.${account.user.id}`] : []),
  ];
  if (!filters.length) return [];
  const applications = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("service_applications")
      .select("id, service_id, status, submitted_at")
      .or(filters.join(",")).order("submitted_at", { ascending: false }).order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    applications.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  if (!applications.length) return [];
  const { data: services, error: serviceError } = await db.from("services").select("id, name");
  if (serviceError) throw new Error(serviceError.message);
  return Promise.all(applications.map(async (application) => {
    const files = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("service_application_files")
        .select("id, original_name, review_status, uploaded_at, created_at")
        .eq("application_id", application.id).eq("upload_status", "uploaded")
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw new Error(error.message);
      files.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    return { ...application, serviceName: services?.find((service) => service.id === application.service_id)?.name ?? "Service application", files };
  }));
}
