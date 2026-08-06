import { connection } from "next/server";
import { getArticles } from "@/lib/articles";
import { PageShell } from "../components/PageShell";
import { PublicArticleList } from "../components/PublicArticleList";

export default async function DocumentsPage() {
  await connection();
  const articles = await getArticles("issuances");

  return (
    <PageShell title="Issuances & Documents">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Official Resources</span>
            <h2>Issuances & Documents</h2>
          </div>
          <p>Read the latest official issuances, documents, references, and communications published by the SMME Unit.</p>
        </section>
        <PublicArticleList articles={articles} category="issuances" />
      </div>
    </PageShell>
  );
}
