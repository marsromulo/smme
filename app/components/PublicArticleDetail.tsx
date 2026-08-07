import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import type { Article, ArticleCategory } from "@/lib/articles";
import { articleCategoryLabel, articleCategoryPath } from "@/lib/articles";
import { PageShell } from "./PageShell";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function PublicArticleDetail({ article, category }: { article: Article; category: ArticleCategory }) {
  return (
    <PageShell title={articleCategoryLabel(category)}>
      <div className="content-stack">
        <Link className="public-article-back" href={articleCategoryPath(category)}>
          <ArrowLeft aria-hidden="true" size={18} /> Back to {articleCategoryLabel(category)}
        </Link>
        <article className="public-article-card public-article-detail">
          <header>
            <h1>{article.title}</h1>
            <time><CalendarDays aria-hidden="true" size={17} /> {formatDate(article.date)}</time>
          </header>
          {article.content ? <div className="article-content">{article.content}</div> : null}
          {article.images.length ? (
            <div className="article-image-grid detail">
              {article.images.map((image) => (
                <a href={image.url} target="_blank" rel="noreferrer" key={image.id} title="Open full image in a new tab">
                  {image.type === "application/pdf" ? (
                    <span className="article-pdf-tile">
                      <FileText aria-hidden="true" size={42} />
                      <strong>PDF</strong>
                      <small>{image.name}</small>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt={image.name} />
                  )}
                </a>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </PageShell>
  );
}
