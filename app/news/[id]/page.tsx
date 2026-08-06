import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { PublicArticleDetail } from "../../components/PublicArticleDetail";

export default async function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const article = await getArticle(id, "news");
  if (!article) notFound();
  return <PublicArticleDetail article={article} category="news" />;
}
