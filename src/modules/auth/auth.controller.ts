import { asyncHandler } from "../../utils/asyncHandler";
import { requireUser } from "../../middleware/auth";
import { loginSchema, registerSchema } from "./auth.schemas";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
});

export const me = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({ user: await authService.getSelf(user.id) });
});
