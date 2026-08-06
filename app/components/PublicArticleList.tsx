import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { Article, ArticleCategory } from "@/lib/articles";
import { articleCategoryPath } from "@/lib/articles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function PublicArticleList({
  articles,
  category,
}: {
  articles: Article[];
  category: ArticleCategory;
}) {
  const basePath = articleCategoryPath(category);

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
          <header>
            <h2><Link href={`${basePath}/${article.id}`}>{article.title}</Link></h2>
            <time><CalendarDays aria-hidden="true" size={16} /> {formatDate(article.date)}</time>
          </header>
          {article.content ? <div className="article-content">{article.content}</div> : null}
          {article.images.length ? (
            <div className="article-image-grid detail">
              {article.images.map((image) => (
                <a href={image.url} target="_blank" rel="noreferrer" key={image.id} title="Open full image in a new tab">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} />
                </a>
              ))}
            </div>
          ) : null}
          <Link className="article-read-link" href={`${basePath}/${article.id}`}>View article &rarr;</Link>
        </article>
      ))}
    </section>
  );
}
