import Link from "next/link";
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

const pageSize = 50;

async function getNotifications(userId: string, role: "admin" | "school", requestedPage: number) {
  const supabase = createSupabaseAdminClient();
  const table = role === "admin" ? "admin_notifications" : "school_notifications";
  function countQuery(unreadOnly = false) {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (role === "school") query = query.eq("recipient_user_id", userId);
    if (unreadOnly) query = query.eq("is_read", false);
    return query;
  }
  const [totalResult, unreadResult] = await Promise.all([countQuery(), countQuery(true)]);
  if (totalResult.error || unreadResult.error) {
    throw new Error(totalResult.error?.message ?? unreadResult.error?.message);
  }
  const total = totalResult.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;
  let query = supabase.from(table).select(
    "id, type, title, body, created_at, is_read, reference_type, reference_id, link_href, school_registration_request_id",
  );
  if (role === "school") query = query.eq("recipient_user_id", userId);
  const { data, error } = await query.order("created_at", { ascending: false })
    .order("id", { ascending: false }).range(start, start + pageSize - 1);
  if (error) throw new Error(error.message);
  return { notifications: (data ?? []) as NotificationRow[], total, unreadCount: unreadResult.count ?? 0, page, pageCount, start };
}

export default async function PlatformNotificationsPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await getPlatformSession();
  if (!session.userId) redirect("/platform/login");
  const params = await searchParams;
  const rawPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { notifications, total, unreadCount, page, pageCount, start } = await getNotifications(session.userId, session.role, requestedPage);

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
            <h2>{total.toLocaleString()} Notifications</h2>
          </div>
          <span className="platform-pill new">{unreadCount} unread</span>
        </div>

        {total > 0 ? (
          <nav className="platform-notification-pagination" aria-label="Notification pages">
            <span>Showing {start + 1}–{start + notifications.length} of {total.toLocaleString()} · Page {page} of {pageCount}</span>
            <div>
              {page > 1 ? <>
                <Link className="platform-table-action" href="/platform/notifications?page=1">First</Link>
                <Link className="platform-table-action" href={`/platform/notifications?page=${page - 1}`}>Previous</Link>
              </> : null}
              {page < pageCount ? <>
                <Link className="platform-table-action" href={`/platform/notifications?page=${page + 1}`}>Next</Link>
                <Link className="platform-table-action" href={`/platform/notifications?page=${pageCount}`}>Last</Link>
              </> : null}
            </div>
          </nav>
        ) : null}

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
