import { connection } from "next/server";
import { getArticles } from "@/lib/articles";
import { PageShell } from "../components/PageShell";
import { PublicArticleList } from "../components/PublicArticleList";

export default async function NewsPage() {
  await connection();
  const articles = await getArticles("news");

  return (
    <PageShell title="News & Updates">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Latest Announcements</span>
            <h2>News & Updates</h2>
          </div>
          <p>Read announcements, reminders, and service updates from the SMME Unit for schools and stakeholders.</p>
        </section>
        <PublicArticleList articles={articles} category="news" />
      </div>
    </PageShell>
  );
}
