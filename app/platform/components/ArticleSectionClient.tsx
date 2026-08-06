"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { FileText, ImagePlus, Newspaper, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { Article, ArticleCategory } from "@/lib/articles";
import { articleCategoryLabel, articleCategoryPath } from "@/lib/articles";

type ArticleForm = {
  id: string;
  title: string;
  content: string;
  date: string;
};

const emptyForm: ArticleForm = {
  content: "",
  date: new Date().toISOString().slice(0, 10),
  id: "",
  title: "",
};

export function ArticleSectionClient({
  category,
  initialArticles,
  isAdmin,
}: {
  category: ArticleCategory;
  initialArticles: Article[];
  isAdmin: boolean;
}) {
  const editorRef = useRef<HTMLElement | null>(null);
  const [articles, setArticles] = useState(initialArticles);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [images, setImages] = useState<File[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const label = articleCategoryLabel(category);
  const basePath = articleCategoryPath(category, true);
  const ListingIcon = category === "issuances" ? FileText : Newspaper;
  const editingArticle = articles.find((article) => article.id === form.id);

  async function reloadArticles() {
    const response = await fetch(`/api/platform/articles?category=${category}`);
    const result = (await response.json()) as { articles?: Article[]; error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to refresh articles.");
    }

    setArticles(result.articles ?? []);
  }

  function openEditor(article?: Article) {
    setForm(
      article
        ? {
            content: article.content,
            date: article.date,
            id: article.id,
            title: article.title,
          }
        : { ...emptyForm, date: new Date().toISOString().slice(0, 10) },
    );
    setImages([]);
    setMessage("");
    setIsEditorOpen(true);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setForm(emptyForm);
    setImages([]);
    setMessage("");
  }

  async function uploadImages(articleId: string, files: File[]) {
    if (!files.length) {
      return;
    }

    const signResponse = await fetch(`/api/platform/articles/${articleId}/images/sign`, {
      body: JSON.stringify({
        images: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const signed = (await signResponse.json()) as {
      error?: string;
      uploads?: Array<{ imageId: string; uploadUrl: string }>;
    };

    if (!signResponse.ok || !signed.uploads) {
      throw new Error(signed.error ?? "Unable to prepare image uploads.");
    }

    await Promise.all(
      signed.uploads.map(async (upload, index) => {
        const response = await fetch(upload.uploadUrl, {
          body: files[index],
          headers: { "Content-Type": files[index]?.type ?? "application/octet-stream" },
          method: "PUT",
        });

        if (!response.ok) {
          throw new Error(`Unable to upload ${files[index]?.name ?? "image"}.`);
        }
      }),
    );

    const completeResponse = await fetch(`/api/platform/articles/${articleId}/images/complete`, {
      body: JSON.stringify({ imageIds: signed.uploads.map((upload) => upload.imageId) }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const complete = (await completeResponse.json()) as { error?: string };

    if (!completeResponse.ok) {
      throw new Error(complete.error ?? "Unable to complete image uploads.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(form.id ? `/api/platform/articles/${form.id}` : "/api/platform/articles", {
        body: JSON.stringify({
          category,
          content: form.content,
          date: form.date,
          title: form.title,
        }),
        headers: { "Content-Type": "application/json" },
        method: form.id ? "PATCH" : "POST",
      });
      const result = (await response.json()) as { articleId?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save article.");
      }

      const articleId = form.id || result.articleId;

      if (!articleId) {
        throw new Error("The saved article could not be identified.");
      }

      if (!form.id) {
        setForm((current) => ({ ...current, id: articleId }));
      }

      await uploadImages(articleId, images);
      await reloadArticles();
      closeEditor();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save article.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (!form.id || !window.confirm("Remove this image from the article?")) {
      return;
    }

    const response = await fetch(`/api/platform/articles/${form.id}/images/${imageId}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(result.error ?? "Unable to remove image.");
      return;
    }

    await reloadArticles();
  }

  async function deleteArticle() {
    if (!form.id || !window.confirm(`Delete “${form.title}” and all its images?`)) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/platform/articles/${form.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete article.");
      }

      setArticles((current) => current.filter((article) => article.id !== form.id));
      closeEditor();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete article.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="platform-page article-maintenance-page">
      <header className="platform-page-head">
        <div>
          <span className="platform-eyebrow">{isAdmin ? "Content Management" : "School Resources"}</span>
          <h1>{label}</h1>
          <p>
            {isAdmin
              ? `Create and maintain the ${label.toLowerCase()} shown to schools and on the public website.`
              : `Browse the latest ${label.toLowerCase()} published by the SMME Unit.`}
          </p>
        </div>
        {isAdmin ? (
          <button className="platform-primary-action" type="button" onClick={() => openEditor()}>
            <Plus aria-hidden="true" size={19} /> New Article
          </button>
        ) : null}
      </header>

      {message && !isEditorOpen ? <p className="platform-form-message error">{message}</p> : null}

      {isAdmin && isEditorOpen ? (
        <section className="platform-panel article-editor" ref={editorRef}>
          <div className="article-editor-head">
            <div>
              <span className="platform-eyebrow">{form.id ? "Edit Article" : "New Article"}</span>
              <h2>{form.id ? form.title || label : `Add ${label}`}</h2>
            </div>
            <button type="button" className="article-icon-button" onClick={closeEditor} aria-label="Close editor">
              <X aria-hidden="true" size={21} />
            </button>
          </div>
          <form className="article-form" onSubmit={handleSubmit}>
            <label>
              <span>Title</span>
              <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              <span>Date</span>
              <input required type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label className="article-form-wide">
              <span>Content <small>(optional)</small></span>
              <textarea rows={9} value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
            </label>
            {editingArticle?.images.length ? (
              <div className="article-form-wide">
                <span className="article-field-label">Current Images</span>
                <div className="article-image-grid admin">
                  {editingArticle.images.map((image) => (
                    <div className="article-image-tile" key={image.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} />
                      <button type="button" onClick={() => void deleteImage(image.id)} aria-label={`Remove ${image.name}`}>
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="article-upload-field article-form-wide">
              <ImagePlus aria-hidden="true" size={25} />
              <span>Add Images <small>Up to 12 images, 10 MB each</small></span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setImages(Array.from(event.target.files ?? []))}
              />
            </label>
            {images.length ? <p className="article-selected-files article-form-wide">{images.map((image) => image.name).join(", ")}</p> : null}
            {message ? <p className="platform-form-message error article-form-wide">{message}</p> : null}
            <div className="article-form-actions article-form-wide">
              {form.id ? (
                <button type="button" className="article-delete-action" onClick={() => void deleteArticle()} disabled={isSaving}>
                  <Trash2 aria-hidden="true" size={18} /> {isSaving ? "Working..." : "Delete"}
                </button>
              ) : <span />}
              <div>
                <button type="button" className="platform-secondary-action" onClick={closeEditor}>Cancel</button>
                <button type="submit" className="platform-primary-action" disabled={isSaving}>
                  <Save aria-hidden="true" size={18} /> {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <section className="article-platform-list">
        {articles.length ? (
          articles.map((article) => (
            <article className="platform-panel article-platform-card" key={article.id}>
              <span className="article-list-icon" aria-hidden="true"><ListingIcon size={22} /></span>
              <h2><Link href={`${basePath}/${article.id}`}>{article.title}</Link></h2>
              {isAdmin ? (
                <div className="article-row-actions">
                  <button type="button" onClick={() => openEditor(article)}><Pencil aria-hidden="true" size={17} /> Edit</button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="platform-panel article-empty-state">
            <h2>No articles yet</h2>
            <p>{isAdmin ? `Create the first article for ${label}.` : "Please check again later for new updates."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
