import Link from "next/link";
import { ImageIcon } from "lucide-react";
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
          <Link className="article-list-thumbnail" href={`${basePath}/${article.id}`}>
            {article.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.images[0].url} alt={article.images[0].name} />
            ) : <span aria-hidden="true"><ImageIcon size={27} /></span>}
          </Link>
          <h2><Link href={`${basePath}/${article.id}`}>{article.title}</Link></h2>
        </article>
      ))}
    </section>
  );
}
