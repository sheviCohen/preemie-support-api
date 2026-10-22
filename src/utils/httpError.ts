/** שגיאה עם קוד HTTP, קוד קבוע (למפתחת ה-React) והודעה בעברית */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new HttpError(400, code, message, details);
export const unauthorized = (code: string, message: string) => new HttpError(401, code, message);
export const forbidden = (message = "אין לך הרשאה לבצע פעולה זו") =>
  new HttpError(403, "FORBIDDEN", message);
export const notFound = (message = "הפריט המבוקש לא נמצא") =>
  new HttpError(404, "NOT_FOUND", message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
