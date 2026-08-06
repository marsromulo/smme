import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { getPlatformSession } from "@/lib/platform/auth";
import { PlatformArticleDetail } from "../../../components/PlatformArticleDetail";

export default async function PlatformIssuanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, session] = await Promise.all([getArticle(id, "issuances"), getPlatformSession()]);
  if (!article) notFound();
  return <PlatformArticleDetail article={article} category="issuances" isAdmin={session.role === "admin"} />;
}
