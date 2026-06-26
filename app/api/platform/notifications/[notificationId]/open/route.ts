import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationRecord = {
  id: string;
  type: string;
  link_href: string | null;
  reference_id: string | null;
  reference_type: string | null;
  school_registration_request_id: string | null;
};

function safePlatformHref(href: string | null | undefined) {
  if (typeof href === "string" && (href === "/platform" || href.startsWith("/platform/"))) {
    return href;
  }

  return "/platform/notifications";
}

function fallbackHref(notification: NotificationRecord) {
  if (notification.link_href) {
    return safePlatformHref(notification.link_href);
  }

  if (notification.school_registration_request_id) {
    return `/platform/registrations/${notification.school_registration_request_id}`;
  }

  if (notification.reference_type === "school_registration" && notification.reference_id) {
    return `/platform/registrations/${notification.reference_id}`;
  }

  if (notification.reference_type === "service_application" && notification.reference_id) {
    return `/platform/submissions/${notification.reference_id}`;
  }

  return "/platform/notifications";
}

async function resolveNotificationHref({
  notification,
  supabase,
}: {
  notification: NotificationRecord;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const fallback = fallbackHref(notification);

  if (fallback !== "/platform/notifications" || notification.reference_type !== "service_application_file") {
    return fallback;
  }

  if (!notification.reference_id) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("service_application_files")
    .select("application_id")
    .eq("id", notification.reference_id)
    .maybeSingle();

  if (error || !data?.application_id) {
    return fallback;
  }

  return `/platform/submissions/${data.application_id}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  const session = await getPlatformSession();
  const { notificationId } = await context.params;

  if (!session.userId) {
    return NextResponse.redirect(new URL("/platform/login", request.url));
  }

  const supabase = createSupabaseAdminClient();
  const tableName = session.role === "admin" ? "admin_notifications" : "school_notifications";
  let query = supabase
    .from(tableName)
    .select("id, type, link_href, reference_type, reference_id, school_registration_request_id")
    .eq("id", notificationId);

  if (session.role === "school") {
    query = query.eq("recipient_user_id", session.userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(new URL("/platform/notifications", request.url));
  }

  let updateQuery = supabase.from(tableName).update({ is_read: true }).eq("id", notificationId).eq("is_read", false);

  if (session.role === "school") {
    updateQuery = updateQuery.eq("recipient_user_id", session.userId);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error("Unable to mark notification as read:", updateError.message);
  }

  const notification = data as NotificationRecord;
  const targetHref = await resolveNotificationHref({ notification, supabase });

  return NextResponse.redirect(new URL(safePlatformHref(targetHref), request.url));
}
