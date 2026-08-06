import { getPlatformSession } from "@/lib/platform/auth";
import { getArticles } from "@/lib/articles";
import { ArticleSectionClient } from "../../components/ArticleSectionClient";

export default async function PlatformIssuancesPage() {
  const [session, articles] = await Promise.all([getPlatformSession(), getArticles("issuances")]);
  return <ArticleSectionClient category="issuances" initialArticles={articles} isAdmin={session.role === "admin"} />;
}
