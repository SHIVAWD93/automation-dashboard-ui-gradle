export interface ToastMessage {
  severity: Severity;
  summary: string;
  detail: string;
}

export enum Severity {
  success = "success",
  info = "info",
  error = "error",
  warn = "warn",
}
