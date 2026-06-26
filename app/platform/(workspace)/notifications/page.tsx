import { redirect } from "next/navigation";
import { Bell, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  link_href: string | null;
  school_registration_request_id?: string | null;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNotificationType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function notificationReferenceLabel(item: NotificationRow) {
  if (item.reference_type && item.reference_id) {
    return `${formatNotificationType(item.reference_type)} · ${item.reference_id.slice(0, 8)}`;
  }

  if (item.school_registration_request_id) {
    return `School Registration · ${item.school_registration_request_id.slice(0, 8)}`;
  }

  return "Notification";
}

async function getNotifications(userId: string, role: "admin" | "school") {
  const supabase = createSupabaseAdminClient();
  const selectColumns =
    "id, type, title, body, created_at, is_read, reference_type, reference_id, link_href, school_registration_request_id";
  const query =
    role === "admin"
      ? supabase.from("admin_notifications").select(selectColumns).order("created_at", { ascending: false }).limit(100)
      : supabase
          .from("school_notifications")
          .select(selectColumns)
          .eq("recipient_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("schema cache") && error.message.includes("notifications")) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as NotificationRow[];
}

export default async function PlatformNotificationsPage() {
  const session = await getPlatformSession();

  if (!session.userId) {
    redirect("/platform/login");
  }

  const notifications = await getNotifications(session.userId, session.role);
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <span className="platform-kicker">Notifications</span>
        <h1>Notification Center</h1>
        <p>
          Review platform alerts and open the related registration, submission, or document record.
        </p>
      </section>

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Inbox</span>
            <h2>{notifications.length} Notifications</h2>
          </div>
          <span className="platform-pill new">{unreadCount} unread</span>
        </div>

        {notifications.length === 0 ? (
          <div className="platform-empty-state">
            <Bell aria-hidden="true" size={28} />
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table platform-notifications-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a
                        className="platform-notification-table-link"
                        href={`/api/platform/notifications/${item.id}/open`}
                      >
                        <span>
                          {item.is_read ? (
                            <CheckCircle2 aria-hidden="true" size={18} />
                          ) : (
                            <Circle aria-hidden="true" size={18} />
                          )}
                        </span>
                        <strong>{item.title}</strong>
                        <small>{item.body}</small>
                      </a>
                    </td>
                    <td>
                      <span>{notificationReferenceLabel(item)}</span>
                    </td>
                    <td>{formatNotificationDate(item.created_at)}</td>
                    <td>
                      <a
                        className="platform-table-action"
                        href={`/api/platform/notifications/${item.id}/open`}
                      >
                        <ExternalLink aria-hidden="true" size={15} />
                        {item.is_read ? "Open" : "Open unread"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
