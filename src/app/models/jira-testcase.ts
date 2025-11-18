export interface Sprint {
  id: string;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
}

export interface JiraIssue {
  id: number;
  jiraKey: string;
  summary: string;
  description: string;
  assignee: string;
  assigneeDisplayName: string;
  sprintId: string;
  sprintName: string;
  issueType: string;
  status: string;
  priority: string;
  keywordCount: number;
  searchKeyword?: string;
  linkedTestCases: JiraTestCase[];
}

export interface JiraTestCase {
  id: number;
  qtestTitle: string;
  qtestId?: string;
  canBeAutomated: boolean;
  cannotBeAutomated: boolean;
  automationStatus: string;
  projectId?: number;
  projectName?: string;
  assignedTesterId?: number;
  assignedTesterName?: string;
  domainMapped?: string;
  toolType?: string | null;
  manualTesterId?: number | null;
  manualTesterName?: string;
  testCaseType?: string | null;
  relatedJiraKey?: string;
  relatedJiraSummary?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  jiraProjectKey?: string;
  jiraBoardId?: string;
  domain: {
    id: number;
    name: string;
  };
}

export interface Tester {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface SprintStatistics {
  totalTestCases: number;
  readyToAutomate: number;
  notAutomatable: number;
  pending: number;
  projectBreakdown: Record<string, Record<string, number>>;
}
