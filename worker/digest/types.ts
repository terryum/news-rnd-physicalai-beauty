import type { Item } from "../../src/data/types";

export interface DigestSection {
  title: string;
  items: Item[];
  color: string; // left-border color (hex)
}

export interface DigestData {
  date: string; // YYYY.MM.DD
  dayOfWeek: string; // 월/화/수/목/금/토/일
  sections: DigestSection[];
  isEmpty: boolean;
  dashboardUrl: string;
}
