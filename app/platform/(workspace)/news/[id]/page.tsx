import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { PlatformArticleDetail } from "../../../components/PlatformArticleDetail";

export default async function PlatformNewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id, "news");
  if (!article) notFound();
  return <PlatformArticleDetail article={article} category="news" />;
}
