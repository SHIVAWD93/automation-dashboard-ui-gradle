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
  // NEW: Jira configuration fields
  jiraProjectKey?: string;
  jiraBoardId?: string;
}