import Link from "next/link";
import { FileText, Newspaper } from "lucide-react";
import type { Article, ArticleCategory } from "@/lib/articles";
import { articleCategoryPath } from "@/lib/articles";

export function PublicArticleList({
  articles,
  category,
}: {
  articles: Article[];
  category: ArticleCategory;
}) {
  const basePath = articleCategoryPath(category);
  const ListingIcon = category === "issuances" ? FileText : Newspaper;

  if (!articles.length) {
    return (
      <section className="prose-panel public-article-empty">
        <h3>No articles published yet</h3>
        <p>Please check again later for new information from the SMME Unit.</p>
      </section>
    );
  }

  return (
    <section className="public-article-list">
      {articles.map((article) => (
        <article className="public-article-card" key={article.id}>
          <span className="article-list-icon" aria-hidden="true"><ListingIcon size={22} /></span>
          <h2><Link href={`${basePath}/${article.id}`}>{article.title}</Link></h2>
        </article>
      ))}
    </section>
  );
}
