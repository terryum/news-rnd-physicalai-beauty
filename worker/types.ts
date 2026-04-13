export interface RawItem {
  sourceId: string;
  title: string;
  url: string;
  publishedAt?: string;
  deadlineAt?: string;
  budgetKrwOk?: number;
  region?: string;
  description?: string;
  agency?: string; // 기관명
}

export interface SourceConfig {
  id: string;
  name: string;
  type: "gov" | "news";
  group: "A" | "B" | "C" | "D" | "E";
  authority: "canonical" | "discovery";
  phase: "fast" | "slow";
  url: string;
  enabled: boolean;
  [key: string]: unknown;
}
