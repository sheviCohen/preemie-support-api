import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { idParamSchema } from "../../utils/zodHelpers";
import { messagesQuerySchema, openDirectSchema, sendMessageSchema } from "./conversations.schemas";
import * as service from "./conversations.service";

export const list = asyncHandler(async (req, res) => {
  res.json(await service.listConversations(requireUser(req)));
});

export const openDirect = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { userId } = openDirectSchema.parse(req.body);
  const result = await service.openDirect(user, userId);
  res.status(result.created ? 201 : 200).json({ conversation: result.conversation });
});

export const messages = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  res.json(await service.getMessages(user, id, messagesQuerySchema.parse(req.query)));
});

export const send = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  const { content } = sendMessageSchema.parse(req.body);
  res.status(201).json(await service.sendMessage(user, id, content));
});

export const read = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { id } = idParamSchema.parse(req.params);
  res.json(await service.markRead(user, id));
});
