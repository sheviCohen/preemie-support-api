import type { Role, StaffRole } from "../domain/constants";

/** המשתמש/ת המחוברים, כפי שנקבע מתוך ה-Token ומסד הנתונים (לא מתוך מה שהלקוח שולח) */
export interface AuthUser {
  id: number;
  role: Role;
  staffRole: StaffRole | null;
  firstName: string;
  lastName: string;
}
