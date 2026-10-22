// קישורים לאתרי קופות החולים, לתצוגה בצד מסך הלו"ז.
// הכתובות הן דפי הבית הרשמיים של הקופות. קישור עמוק לדף קביעת תור לא נבדק בזמן הבנייה
// ויכול להשתנות, ולכן לא נכלל. אפשר לעדכן כאן בקובץ אחד.

export interface HealthFundLink {
  id: string;
  name: string;
  url: string;
}

export const HEALTH_FUND_LINKS: readonly HealthFundLink[] = [
  { id: "clalit", name: "כללית", url: "https://www.clalit.co.il" },
  { id: "maccabi", name: "מכבי שירותי בריאות", url: "https://www.maccabi4u.co.il" },
  { id: "meuhedet", name: "מאוחדת", url: "https://www.meuhedet.co.il" },
  { id: "leumit", name: "לאומית", url: "https://www.leumit.co.il" },
];
