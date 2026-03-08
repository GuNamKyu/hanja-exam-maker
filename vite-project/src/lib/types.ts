export type HistoryLog = Record<string, string[]>;

export interface ExamSectionDef {
  sheet: string;
  count: number;
  title: string;
  q_idx: number;
  a_idx?: number;
  d_idx?: number;
  dedup_idx?: number;
  filter?: (row: string[]) => boolean;
  fmt: (q: string, d?: string) => string;
}

export interface QuestionItem {
  q: string;
  a: string;
}

export interface ExamSectionData {
  title: string;
  items: QuestionItem[];
}
