import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { getSelf } from "../auth/auth.service";
import { avatarSchema, updateProfileSchema } from "./profile.schemas";
import * as profileService from "./profile.service";

export const getProfile = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({ user: await getSelf(user.id) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const input = updateProfileSchema.parse(req.body);
  res.json({ user: await profileService.updateProfile(user.id, user.role, input) });
});

export const setAvatar = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { image } = avatarSchema.parse(req.body);
  res.json({ avatar: await profileService.setAvatar(user.id, image) });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  await profileService.removeAvatar(user.id);
  res.status(204).send();
});
