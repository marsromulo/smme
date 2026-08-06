import { notFound } from "next/navigation";
import { getArticle, markArticleRead } from "@/lib/articles";
import { getPlatformSession } from "@/lib/platform/auth";
import { PlatformArticleDetail } from "../../../components/PlatformArticleDetail";

export default async function PlatformNewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, session] = await Promise.all([getArticle(id, "news"), getPlatformSession()]);
  if (!article) notFound();
  if (session.role === "school" && session.userId) await markArticleRead(article.id, session.userId);
  return <PlatformArticleDetail article={article} category="news" />;
}
