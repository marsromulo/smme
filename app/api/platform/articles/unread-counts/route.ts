import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getPlatformSession();

  if (!session.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "school") {
    return Response.json({ issuances: 0, news: 0 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const [{ data: articles, error: articlesError }, { data: reads, error: readsError }] =
      await Promise.all([
        supabase.from("articles").select("id, category"),
        supabase.from("article_reads").select("article_id").eq("user_id", session.userId),
      ]);

    if (articlesError || readsError) {
      throw articlesError ?? readsError;
    }

    const readIds = new Set((reads ?? []).map((read) => read.article_id));
    const counts = { issuances: 0, news: 0 };

    for (const article of articles ?? []) {
      if (readIds.has(article.id)) {
        continue;
      }

      if (article.category === "issuances") {
        counts.issuances += 1;
      } else if (article.category === "news") {
        counts.news += 1;
      }
    }

    return Response.json(counts);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load unread article counts." },
      { status: 500 },
    );
  }
}
