import { Tester } from './tester.model';
import { Project } from './project.model';

export interface JenkinsResult {
  id: number;
  jobName: string;
  buildNumber: string;
  buildStatus: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  buildUrl: string;
  buildTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  testCases?: JenkinsTestCase[];
  automationTester?: Tester | number;
  manualTester?: Tester | number;
  bugsIdentified?: string;
  failureReasons?: string;
  // Add passPercentage property to fix the TypeScript error
  passPercentage?: number;
  project?: Project; // NEW: Added project field
  jobFrequency?: string; // NEW: Added job frequency field
}

export interface JenkinsTestCase {
  id: number;
  testName: string;
  className: string;
  status: string;
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
  createdAt: Date;
}

export interface JenkinsStatistics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

export interface JenkinsConnectionTest {
  connected: boolean;
  message: string;
}
// NEW: Filter interfaces for enhanced filtering
export interface JenkinsFilters {
  projectId?: number;
  automationTesterId?: number;
  jobFrequency?: string;
  buildStatus?: string;
  searchTerm?: string;
  passPercentageThreshold?: number;
}

// NEW: Filter options for dropdowns
export interface FilterOption {
  value: string | number;
  label: string;
}

// NEW: Job frequency options
export const JOB_FREQUENCY_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Frequencies' },
  { value: 'Hourly', label: 'Hourly' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'On Demand', label: 'On Demand' },
  { value: 'Continuous', label: 'Continuous' },
  { value: 'Unknown', label: 'Unknown' }
];

// NEW: Enhanced save request interface
export interface CombinedSaveRequest {
  notes?: string;
  automationTesterId?: number | null;
  manualTesterId?: number | null;
  projectId?: number | null;
  jobFrequency?: string;
}
