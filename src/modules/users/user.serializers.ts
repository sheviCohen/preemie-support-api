import type { Role, StaffRole } from "../../domain/constants";

// המרת רשומות ממסד הנתונים למה שנשלח ללקוח. כאן מוגדר מה פרטי ומה ציבורי:
// סיסמה (Hash) לא נשלחת לעולם. טלפון ואימייל נשלחים רק לבעלת החשבון ולצוות.

export interface BabyRow {
  id: number;
  name: string;
  birthDate: Date;
  gestationalWeek: number;
  birthWeightGrams: number;
  notes: string | null;
}

export interface UserRow {
  id: number;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  city: string | null;
  avatarData: string | null;
  staffRole: StaffRole | null;
  createdAt: Date;
}

export interface PublicUserRow {
  id: number;
  firstName: string;
  lastName: string;
  city: string | null;
  avatarData: string | null;
  role: Role;
  staffRole: StaffRole | null;
}

export function toBabyDto(baby: BabyRow) {
  return {
    id: baby.id,
    name: baby.name,
    birthDate: baby.birthDate.toISOString(),
    gestationalWeek: baby.gestationalWeek,
    birthWeightGrams: baby.birthWeightGrams,
    notes: baby.notes,
  };
}

/** הפרופיל המלא: לבעלת החשבון ולאיש צוות (צפייה בלבד) */
export function toSelfDto(user: UserRow, baby: BabyRow | null) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    city: user.city,
    avatar: user.avatarData,
    staffRole: user.staffRole,
    createdAt: user.createdAt.toISOString(),
    baby: baby ? toBabyDto(baby) : null,
  };
}

/** מה שאמהות אחרות רואות: שם, תמונה ועיר בלבד */
export function toMotherListItem(user: PublicUserRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    city: user.city,
    avatar: user.avatarData,
  };
}

export function toStaffListItem(user: PublicUserRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    staffRole: user.staffRole,
    avatar: user.avatarData,
  };
}

/** משתמש/ת בתוך שיחה או מאמר: מזהה, שם, תפקיד ותמונה */
export function toUserSummary(user: PublicUserRow) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    staffRole: user.staffRole,
    avatar: user.avatarData,
  };
}

export const PUBLIC_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  city: true,
  avatarData: true,
  role: true,
  staffRole: true,
} as const;
