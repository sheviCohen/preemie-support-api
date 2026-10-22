import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { AuthUser } from "../../types/auth";
import { badRequest, forbidden, notFound } from "../../utils/httpError";
import { PUBLIC_USER_SELECT, toUserSummary } from "../users/user.serializers";
import type {
  CreateArticleInput,
  ListArticlesQuery,
  UpdateArticleInput,
} from "./articles.schemas";

const articleInclude = { author: { select: PUBLIC_USER_SELECT } } satisfies Prisma.ArticleInclude;
type ArticleRow = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;

/** האם הוא מאמר חיצוני (כרטיס עם קישור) או מאמר צוות (טקסט מלא) */
function kindOf(article: { body: string | null }): "external" | "staff" {
  return article.body === null ? "external" : "staff";
}

export function toArticleDto(article: ArticleRow, user: AuthUser, withBody: boolean) {
  return {
    id: article.id,
    kind: kindOf(article),
    title: article.title,
    summary: article.summary,
    category: article.category,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    ...(withBody ? { body: article.body } : {}),
    author: toUserSummary(article.author),
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    canEdit: user.role === "STAFF" && article.authorId === user.id,
  };
}

export async function listArticles(user: AuthUser, query: ListArticlesQuery) {
  const where: Prisma.ArticleWhereInput = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.kind === "external" ? { body: null } : {}),
    ...(query.kind === "staff" ? { body: { not: null } } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { summary: { contains: query.search, mode: "insensitive" } },
            { sourceName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: articleInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.article.count({ where }),
  ]);
  // ברשימה לא שולחים את הטקסט המלא
  return { articles: rows.map((row) => toArticleDto(row, user, false)), total };
}

export async function getArticle(user: AuthUser, id: number) {
  const article = await prisma.article.findUnique({ where: { id }, include: articleInclude });
  if (!article) {
    throw notFound("המאמר לא נמצא");
  }
  return { article: toArticleDto(article, user, true) };
}

export async function createArticle(user: AuthUser, input: CreateArticleInput) {
  const created = await prisma.article.create({
    data: {
      authorId: user.id,
      title: input.title,
      summary: input.summary,
      category: input.category,
      sourceName: input.sourceName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      body: input.body ?? null,
    },
    include: articleInclude,
  });
  return { article: toArticleDto(created, user, true) };
}

export async function updateArticle(user: AuthUser, id: number, input: UpdateArticleInput) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    throw notFound("המאמר לא נמצא");
  }
  // רק מי שכתב/הוסיף את המאמר רשאי/ת לערוך אותו
  if (existing.authorId !== user.id) {
    throw forbidden("אפשר לערוך רק מאמר שהוספת בעצמך");
  }
  // סוג המאמר לא משתנה: חיצוני נשאר חיצוני, מאמר צוות נשאר מאמר צוות
  if (kindOf(existing) === "external" && input.body !== undefined) {
    throw badRequest("VALIDATION_ERROR", "מאמר חיצוני לא כולל תוכן מלא (body)");
  }
  if (
    kindOf(existing) === "staff" &&
    (input.sourceName !== undefined || input.sourceUrl !== undefined)
  ) {
    throw badRequest("VALIDATION_ERROR", "מאמר צוות לא כולל מקור וקישור");
  }
  const updated = await prisma.article.update({
    where: { id },
    data: {
      title: input.title,
      summary: input.summary,
      category: input.category,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      body: input.body,
    },
    include: articleInclude,
  });
  return { article: toArticleDto(updated, user, true) };
}

export async function deleteArticle(user: AuthUser, id: number) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) {
    throw notFound("המאמר לא נמצא");
  }
  if (existing.authorId !== user.id) {
    throw forbidden("אפשר למחוק רק מאמר שהוספת בעצמך");
  }
  await prisma.article.delete({ where: { id } });
}
