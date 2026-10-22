import type { NextFunction, Request, RequestHandler, Response } from "express";

/** עוטף Controller אסינכרוני כך ששגיאה בו מגיעה אוטומטית למטפל השגיאות */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
