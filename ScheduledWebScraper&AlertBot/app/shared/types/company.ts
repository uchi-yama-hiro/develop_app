/** 企業情報 */
export interface Company {
  /** UUID v4 */
  id: string;
  /** 企業名（例: "トヨタ自動車"） */
  name: string;
  /** ISO 8601 (例: "2026-02-28T10:30:00Z") */
  createdAt: string;
}

/** 企業登録上限 */
export const MAX_COMPANIES = 30;
