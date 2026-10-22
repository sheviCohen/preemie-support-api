import { z } from "zod";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { idParamSchema } from "../../utils/zodHelpers";
import * as service from "./notifications.service";

const listQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"], { errorMap: () => ({ message: "unreadOnly חייב להיות true או false" }) })
    .default("false")
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1, "limit מינימלי 1").max(100, "limit מרבי 100").default(50),
  beforeId: z.coerce.number().int().positive().optional(),
});

export const list = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const query = listQuerySchema.parse(req.query);
  res.json(await service.listNotifications(user.id, query));
});

export const read = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  res.json({ notification: await service.markRead(user.id, id) });
});

export const readAll = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json(await service.markAllRead(user.id));
});
