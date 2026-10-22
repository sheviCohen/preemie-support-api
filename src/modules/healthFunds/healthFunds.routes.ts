import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { HEALTH_FUND_LINKS } from "./healthFunds";

export const healthFundsRouter = Router();
healthFundsRouter.use(authenticate);

healthFundsRouter.get("/", (_req, res) => {
  res.json({ healthFunds: HEALTH_FUND_LINKS });
});
