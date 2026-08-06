import { notFound } from "next/navigation";
import { getArticle } from "@/lib/articles";
import { PlatformArticleDetail } from "../../../components/PlatformArticleDetail";

export default async function PlatformIssuanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id, "issuances");
  if (!article) notFound();
  return <PlatformArticleDetail article={article} category="issuances" />;
}
