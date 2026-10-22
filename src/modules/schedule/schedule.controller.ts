import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createScheduleSchema,
  deleteScheduleQuerySchema,
  idParamSchema,
  listScheduleQuerySchema,
  updateScheduleSchema,
} from "./schedule.schemas";
import * as service from "./schedule.service";

export const list = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json(await service.listSchedule(user, listScheduleQuerySchema.parse(req.query)));
});

export const get = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  res.json(await service.getScheduleItem(user, id));
});

export const create = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const input = createScheduleSchema.parse(req.body);
  res.status(201).json(await service.createSchedule(user, input));
});

export const update = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateScheduleSchema.parse(req.body);
  res.json(await service.updateSchedule(user, id, input));
});

export const remove = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  const { scope } = deleteScheduleQuerySchema.parse(req.query);
  res.json(await service.deleteSchedule(user, id, scope));
});
