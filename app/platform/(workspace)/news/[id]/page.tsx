import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { getPlatformSession } from "@/lib/platform/auth";
import { PlatformArticleDetail } from "../../../components/PlatformArticleDetail";

export default async function PlatformNewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, session] = await Promise.all([getArticle(id, "news"), getPlatformSession()]);
  if (!article) notFound();
  return <PlatformArticleDetail article={article} category="news" isAdmin={session.role === "admin"} />;
}
