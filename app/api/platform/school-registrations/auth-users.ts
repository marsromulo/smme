import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type SchoolAuthProfile = {
  contactNumber?: string | null;
  registrationId?: string;
  representativeEmail: string;
  representativeName: string;
  schoolId?: string | null;
  schoolName: string;
};

const pendingSchoolBanDuration = "876000h";

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function schoolUserMetadata(profile: SchoolAuthProfile) {
  return {
    contact_number: profile.contactNumber ?? null,
    email: profile.representativeEmail,
    full_name: profile.representativeName,
    name: profile.representativeName,
    school_id: profile.schoolId ?? null,
    school_name: profile.schoolName,
  };
}

function schoolAppMetadata(profile: SchoolAuthProfile, accountStatus: "approved" | "pending") {
  return {
    account_status: accountStatus,
    role: "school",
    school_id: profile.schoolId ?? null,
    school_name: profile.schoolName,
    school_registration_request_id: profile.registrationId ?? null,
  };
}

export async function findAuthUserByEmail(
  supabase: SupabaseAdminClient,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { error };
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);

    if (user) {
      return { user };
    }

    if (!data.nextPage) {
      return { user: null };
    }

    page = data.nextPage;
  }
}

export async function createPendingSchoolAuthUser(
  supabase: SupabaseAdminClient,
  profile: SchoolAuthProfile,
  password: string,
) {
  const existing = await findAuthUserByEmail(supabase, profile.representativeEmail);

  if (existing.error) {
    return { error: existing.error };
  }

  if (existing.user) {
    return { error: new Error("An account with this email already exists. Use a different email or sign in.") };
  }

  return supabase.auth.admin.createUser({
    app_metadata: schoolAppMetadata(profile, "pending"),
    ban_duration: pendingSchoolBanDuration,
    email: profile.representativeEmail,
    email_confirm: true,
    password,
    user_metadata: schoolUserMetadata(profile),
  });
}

export async function approveSchoolAuthUser(
  supabase: SupabaseAdminClient,
  profile: SchoolAuthProfile,
) {
  const existing = await findAuthUserByEmail(supabase, profile.representativeEmail);

  if (existing.error) {
    return { error: existing.error };
  }

  const user: User | null = existing.user ?? null;

  if (!user) {
    return {
      error: new Error(
        "School login account was not found. Ask the school to submit the registration form again so the account can be created without a Supabase invite email.",
      ),
    };
  }

  const updated = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...metadataRecord(user.app_metadata),
      ...schoolAppMetadata(profile, "approved"),
    },
    ban_duration: "none",
    email_confirm: true,
    user_metadata: {
      ...metadataRecord(user.user_metadata),
      ...schoolUserMetadata(profile),
    },
  });

  if (updated.error) {
    return { error: updated.error };
  }

  return { user: updated.data.user };
}

export async function setPendingSchoolAuthUser(
  supabase: SupabaseAdminClient,
  profile: SchoolAuthProfile,
) {
  const existing = await findAuthUserByEmail(supabase, profile.representativeEmail);

  if (existing.error || !existing.user) {
    return { error: existing.error ?? null };
  }

  const user = existing.user;

  return supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...metadataRecord(user.app_metadata),
      ...schoolAppMetadata(profile, "pending"),
    },
    ban_duration: pendingSchoolBanDuration,
    user_metadata: {
      ...metadataRecord(user.user_metadata),
      ...schoolUserMetadata(profile),
    },
  });
}

export async function rejectSchoolAuthUser(
  supabase: SupabaseAdminClient,
  profile: SchoolAuthProfile,
) {
  const existing = await findAuthUserByEmail(supabase, profile.representativeEmail);

  if (existing.error || !existing.user) {
    return { error: existing.error ?? null };
  }

  const user = existing.user;

  return supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...metadataRecord(user.app_metadata),
      ...schoolAppMetadata(profile, "pending"),
      account_status: "rejected",
    },
    ban_duration: pendingSchoolBanDuration,
    user_metadata: {
      ...metadataRecord(user.user_metadata),
      ...schoolUserMetadata(profile),
    },
  });
}
