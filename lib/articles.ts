import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ArticleCategory = "issuances" | "news";

export type ArticleImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  sortOrder: number;
  url: string;
};

export type Article = {
  id: string;
  category: ArticleCategory;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  images: ArticleImage[];
};

export function isArticleCategory(value: unknown): value is ArticleCategory {
  return value === "issuances" || value === "news";
}

export function articleCategoryLabel(category: ArticleCategory) {
  return category === "issuances" ? "Issuances & Documents" : "News & Updates";
}

export function articleCategoryPath(category: ArticleCategory, platform = false) {
  const segment = category === "issuances" ? "issuances" : "news";
  return platform ? `/platform/${segment}` : category === "issuances" ? "/documents" : "/news";
}

type ArticleRow = {
  id: string;
  category: ArticleCategory;
  title: string;
  content: string | null;
  article_date: string;
  created_at: string;
  updated_at: string;
};

type ImageRow = {
  id: string;
  article_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};

export function mapArticles(rows: ArticleRow[], imageRows: ImageRow[]): Article[] {
  return rows.map((row) => ({
    category: row.category,
    content: row.content ?? "",
    createdAt: row.created_at,
    date: row.article_date,
    id: row.id,
    images: imageRows
      .filter((image) => image.article_id === row.id)
      .map((image) => ({
        id: image.id,
        name: image.original_name,
        size: image.size_bytes,
        sortOrder: image.sort_order,
        type: image.mime_type,
        url: `/api/articles/images/${image.id}`,
      })),
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function getArticles(category: ArticleCategory, limit?: number) {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("articles")
      .select("id, category, title, content, article_date, created_at, updated_at")
      .eq("category", category)
      .order("article_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Unable to load articles:", error.message);
      return [];
    }

    const articleRows = (rows ?? []) as ArticleRow[];
    const articleIds = articleRows.map((article) => article.id);
    const { data: images, error: imagesError } = await supabase
      .from("article_images")
      .select("id, article_id, original_name, mime_type, size_bytes, sort_order")
      .eq("upload_status", "uploaded")
      .in("article_id", articleIds.length ? articleIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (imagesError) {
      console.error("Unable to load article images:", imagesError.message);
    }

    return mapArticles(articleRows, (images ?? []) as ImageRow[]);
  } catch (error) {
    console.error("Unable to load articles:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getArticle(id: string, category?: ArticleCategory) {
  const articles = await getArticles(category ?? "news");
  const match = articles.find((article) => article.id === id);

  if (match || category) {
    return match ?? null;
  }

  const issuances = await getArticles("issuances");
  return issuances.find((article) => article.id === id) ?? null;
}
