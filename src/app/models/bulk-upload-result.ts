export interface BulkUploadResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  duplicates: string[];
}
