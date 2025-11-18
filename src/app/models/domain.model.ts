export interface Domain {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  projects?: Project[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  domain: Domain;
  createdAt: Date;
  updatedAt: Date;
  testCaseCount?: number;
}

export interface DomainStats {
  totalProjects: number;
  totalTestCases: number;
  automatedTestCases: number;
  inProgressTestCases: number;
  readyTestCases: number;
  completedTestCases: number;
  cannotBeAutomated: number;
}
