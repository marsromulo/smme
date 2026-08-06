import { getPlatformSession } from "@/lib/platform/auth";
import { getArticles } from "@/lib/articles";
import { ArticleSectionClient } from "../../components/ArticleSectionClient";

export default async function PlatformNewsPage() {
  const [session, articles] = await Promise.all([getPlatformSession(), getArticles("news")]);
  return <ArticleSectionClient category="news" initialArticles={articles} isAdmin={session.role === "admin"} />;
}
