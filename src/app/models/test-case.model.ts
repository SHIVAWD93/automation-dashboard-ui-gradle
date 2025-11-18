export interface TestCase {
  id: number;
  title: string;
  description: string;
  testSteps: string;
  expectedResult: string;
  projectId: number;
  testerId: number;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  testCaseType?: string | null;
  toolType?: string | null;
  manualTesterId?: number | null;
  manualTesterName?: string;
}
