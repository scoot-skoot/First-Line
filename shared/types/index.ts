// Single source of truth for JSON contracts shared by /server and /web.
export interface CallerTurn {
  caller_line: string;
  emotion: string;
  distress: number; // 0-100
  trust?: number; // 0-100
  revealed_warning_signs: string[];
  should_end_call: boolean;
}
