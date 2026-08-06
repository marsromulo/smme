"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteArticleButton({
  articleId,
  articleTitle,
  returnPath,
}: {
  articleId: string;
  articleTitle: string;
  returnPath: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Delete “${articleTitle}” and all its images?`)) {
      return;
    }

    setIsDeleting(true);
    setError("");
    const response = await fetch(`/api/platform/articles/${articleId}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to delete article.");
      setIsDeleting(false);
      return;
    }

    router.replace(returnPath);
    router.refresh();
  }

  return (
    <div className="article-delete-control">
      <button type="button" onClick={() => void handleDelete()} disabled={isDeleting}>
        <Trash2 aria-hidden="true" size={18} />
        {isDeleting ? "Deleting..." : "Delete Article"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
