import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { idParamSchema } from "../../utils/zodHelpers";
import { listUsersQuerySchema } from "./users.schemas";
import * as usersService from "./users.service";

export const listMothers = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const query = listUsersQuerySchema.parse(req.query);
  res.json(await usersService.listMothers(user.id, query));
});

export const listStaff = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const query = listUsersQuerySchema.parse(req.query);
  res.json(await usersService.listStaff(user.id, query));
});

export const getMotherProfile = asyncHandler(async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await usersService.getMotherFullProfile(id));
});
