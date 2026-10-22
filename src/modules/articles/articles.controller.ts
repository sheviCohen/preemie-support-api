import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { idParamSchema } from "../../utils/zodHelpers";
import {
  createArticleSchema,
  listArticlesQuerySchema,
  updateArticleSchema,
} from "./articles.schemas";
import * as service from "./articles.service";

export const list = asyncHandler(async (req, res) => {
  res.json(await service.listArticles(requireUser(req), listArticlesQuerySchema.parse(req.query)));
});

export const get = asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await service.getArticle(requireUser(req), id));
});

export const create = asyncHandler(async (req, res) => {
  const input = createArticleSchema.parse(req.body);
  res.status(201).json(await service.createArticle(requireUser(req), input));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = updateArticleSchema.parse(req.body);
  res.json(await service.updateArticle(requireUser(req), id, input));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await service.deleteArticle(requireUser(req), id);
  res.status(204).send();
});
