import { getPlatformSession } from "@/lib/platform/auth";
import { getArticles, isArticleCategory } from "@/lib/articles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/app/api/platform/school-registrations/helpers";

function parsePayload(body: unknown) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const category = record.category;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const content = typeof record.content === "string" ? record.content.trim() : "";
  const date = typeof record.date === "string" ? record.date.trim() : "";

  if (!isArticleCategory(category)) {
    return { error: "Select a valid article section." };
  }

  if (!title) {
    return { error: "Title is required." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Enter a valid article date." };
  }

  return { data: { category, content, date, title } };
}

export async function GET(request: Request) {
  const session = await getPlatformSession();

  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = new URL(request.url).searchParams.get("category");

  if (!isArticleCategory(category)) {
    return Response.json({ error: "Invalid article section." }, { status: 400 });
  }

  return Response.json({ articles: await getArticles(category) });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();

  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.error === "Forbidden" ? 403 : 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parsePayload(body);

  if (!parsed.data) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .insert({
        article_date: parsed.data.date,
        category: parsed.data.category,
        content: parsed.data.content || null,
        created_by: auth.userId,
        title: parsed.data.title,
      })
      .select("id")
      .single();

    if (error || !data) {
      return Response.json({ error: error?.message ?? "Unable to create article." }, { status: 500 });
    }

    return Response.json({ articleId: data.id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to create article." },
      { status: 500 },
    );
  }
}
