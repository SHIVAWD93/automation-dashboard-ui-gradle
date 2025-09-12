// manual-coverage.component.ts - Enhanced version
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Sprint {
  id: string;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
}

interface JiraIssue {
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

interface JiraTestCase {
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
}

interface Project {
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

interface Domain {
  id: number;
  name: string;
}

interface Tester {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface SprintStatistics {
  totalTestCases: number;
  readyToAutomate: number;
  notAutomatable: number;
  pending: number;
  projectBreakdown: Record<string, Record<string, number>>;
}

@Component({
  selector: 'app-manual-coverage',
  templateUrl: './manual-coverage.component.html',
  styleUrls: ['./manual-coverage.component.css']
})
export class ManualCoverageComponent implements OnInit {
  Math = Math;

  // Main data
  sprints: Sprint[] = [];
  selectedSprint: Sprint | null = null;
  jiraIssues: JiraIssue[] = [];
  projects: Project[] = [];
  domains: Domain[] = [];
  testers: Tester[] = [];
  sprintStatistics: SprintStatistics | null = null;

  // UI State
  loading = false;
  connectionStatus: { connected: boolean; message: string } | null = null;
  activeTab = 'sprints';
  searchTerm = '';
  selectedProject: Project | null = null;
  selectedTester: Tester | null = null;
  keywordSearchForm: FormGroup;

  // NEW: Enhanced filters
  selectedDomain: Domain | null = null;
  selectedProjectForSprints: Project | null = null;
  showAllSprints = false; // Radio button state
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  // Filters
  statusFilter = '';
  priorityFilter = '';
  assigneeFilter = '';

  // Modal states
  showTestCaseModal = false;
  showMappingModal = false;
  showKeywordModal = false;
  selectedTestCase: JiraTestCase | null = null;
  selectedIssue: JiraIssue | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.keywordSearchForm = this.fb.group({
      keyword: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    this.testConnection();
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadDomains(),
        this.loadProjects(),
        this.loadTesters()
      ]);

      // Load sprints after domains and projects are loaded
      await this.loadSprints();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  // NEW: Load domains
  loadDomains(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getActiveDomains().subscribe(
        (domains: Domain[]) => {
          this.domains = domains;
          resolve();
        },
        (error) => {
          console.error('Error loading domains:', error);
          reject(error);
        }
      );
    });
  }

  // Connection and Sprint Management
  testConnection(): void {
    this.loading = true;
    this.apiService.testJiraConnection().subscribe(
      (response) => {
        this.connectionStatus = response;
        this.loading = false;
      },
      (error) => {
        this.connectionStatus = { connected: false, message: 'Connection failed' };
        this.loading = false;
        console.error('Connection test failed:', error);
      }
    );
  }

  // ENHANCED: Load sprints with project filtering
  loadSprints(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use selected project's Jira config if available
      const jiraProjectKey = this.selectedProjectForSprints?.jiraProjectKey;
      const jiraBoardId = this.selectedProjectForSprints?.jiraBoardId;

      this.apiService.getJiraSprints(jiraProjectKey, jiraBoardId).subscribe(
        (sprints: Sprint[]) => {
          this.sprints = sprints;

          // Auto-select active sprint by default
          if (!this.showAllSprints && sprints.length > 0) {
            const activeSprint = sprints.find(s => s.state.toLowerCase() === 'active');
            if (activeSprint) {
              this.selectSprint(activeSprint);
            }
          }

          resolve();
        },
        (error) => {
          console.error('Error loading sprints:', error);
          reject(error);
        }
      );
    });
  }

  loadProjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getManualPageProjects().subscribe(
        (projects: Project[]) => {
          this.projects = projects;
          resolve();
        },
        (error) => {
          console.error('Error loading projects:', error);
          reject(error);
        }
      );
    });
  }

  loadTesters(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getManualPageTesters().subscribe(
        (testers: Tester[]) => {
          this.testers = testers;
          resolve();
        },
        (error) => {
          console.error('Error loading testers:', error);
          reject(error);
        }
      );
    });
  }

  // NEW: Filter handlers
  onDomainChange(): void {
    this.selectedProjectForSprints = null;
    this.loadSprints();
  }

  onProjectChange(): void {
    this.loadSprints();
  }

  onSprintViewToggle(): void {
    if (this.showAllSprints) {
      // Show all sprints
      this.selectedSprint = null;
    } else {
      // Show only active sprint
      const activeSprint = this.sprints.find(s => s.state.toLowerCase() === 'active');
      if (activeSprint) {
        this.selectSprint(activeSprint);
      }
    }
  }

  // Get filtered projects by domain
  get filteredProjectsForSprints(): Project[] {
    if (!this.selectedDomain) {
      return this.projects;
    }
    return this.projects.filter(p => p.domain.id === this.selectedDomain.id);
  }

  // Get filtered sprints
  get filteredSprints(): Sprint[] {
    if (this.showAllSprints) {
      return this.sprints;
    }
    return this.sprints.filter(s => s.state.toLowerCase() === 'active');
  }

  selectSprint(sprint: Sprint): void {
    if (this.selectedSprint?.id === sprint.id) {
      return; // Already selected
    }

    this.selectedSprint = sprint;
    this.syncSprintIssues(sprint.id);
    this.loadSprintStatistics(sprint.id);
    this.activeTab = 'issues';
  }

  syncSprintIssues(sprintId: string): void {
    this.loading = true;

    // Use selected project's Jira config if available
    const jiraProjectKey = this.selectedProjectForSprints?.jiraProjectKey;
    const jiraBoardId = this.selectedProjectForSprints?.jiraBoardId;

    this.apiService.syncSprintIssues(sprintId, jiraProjectKey, jiraBoardId).subscribe(
      (issues: JiraIssue[]) => {
        this.jiraIssues = issues;
        this.loading = false;
      },
      (error) => {
        console.error('Error syncing sprint issues:', error);
        this.loading = false;
      }
    );
  }

  loadSprintStatistics(sprintId: string): void {
    this.apiService.getSprintStatistics(sprintId).subscribe(
      (stats: SprintStatistics) => {
        this.sprintStatistics = stats;
      },
      (error) => {
        console.error('Error loading sprint statistics:', error);
      }
    );
  }

  // NEW: Sorting functionality
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Test Case Management
  openTestCaseModal(testCase: JiraTestCase, issue: JiraIssue): void {
    this.selectedTestCase = testCase;
    this.selectedIssue = issue;
    this.showTestCaseModal = true;
  }

  updateTestCaseAutomationFlags(canBeAutomated: boolean, cannotBeAutomated: boolean): void {
    if (!this.selectedTestCase) return;

    this.loading = true;
    this.apiService.updateTestCaseAutomationFlags(this.selectedTestCase.id, {
      canBeAutomated,
      cannotBeAutomated
    }).subscribe(
      (updatedTestCase: JiraTestCase) => {
        this.updateLocalTestCase(updatedTestCase);
        this.showTestCaseModal = false;
        this.loading = false;

        if (this.selectedSprint) {
          this.loadSprintStatistics(this.selectedSprint.id);
        }
      },
      (error) => {
        console.error('Error updating test case flags:', error);
        this.loading = false;
      }
    );
  }

  // Test Case Mapping
  openMappingModal(testCase: JiraTestCase): void {
    this.selectedTestCase = testCase;
    this.selectedProject = this.projects.find(p => p.id === testCase.projectId) || null;
    this.selectedTester = this.testers.find(t => t.id === testCase.assignedTesterId) || null;
    this.showMappingModal = true;
  }

  mapTestCase(): void {
    if (!this.selectedTestCase || !this.selectedProject || !this.selectedTester) return;

    this.loading = true;
    this.apiService.mapTestCase(this.selectedTestCase.id, {
      projectId: this.selectedProject.id,
      testerId: this.selectedTester.id
    }).subscribe(
      (updatedTestCase: JiraTestCase) => {
        this.updateLocalTestCase(updatedTestCase);
        this.showMappingModal = false;
        this.loading = false;
      },
      (error) => {
        console.error('Error mapping test case:', error);
        this.loading = false;
      }
    );
  }

  // Keyword Search
  openKeywordModal(issue: JiraIssue): void {
    this.selectedIssue = issue;
    this.showKeywordModal = true;
    this.keywordSearchForm.reset();
  }

  searchKeyword(): void {
    if (!this.selectedIssue || !this.keywordSearchForm.valid) return;

    const keyword = this.keywordSearchForm.get('keyword')?.value;
    this.loading = true;

    this.apiService.searchKeywordInComments(this.selectedIssue.jiraKey, { keyword }).subscribe(
      (updatedIssue: JiraIssue) => {
        const index = this.jiraIssues.findIndex(i => i.id === updatedIssue.id);
        if (index !== -1) {
          this.jiraIssues[index] = updatedIssue;
        }
        this.showKeywordModal = false;
        this.loading = false;
      },
      (error) => {
        console.error('Error searching keyword:', error);
        this.loading = false;
      }
    );
  }

  // Utility methods
  updateLocalTestCase(updatedTestCase: JiraTestCase): void {
    for (const issue of this.jiraIssues) {
      const testCaseIndex = issue.linkedTestCases.findIndex(tc => tc.id === updatedTestCase.id);
      if (testCaseIndex !== -1) {
        issue.linkedTestCases[testCaseIndex] = updatedTestCase;
        break;
      }
    }
  }

  // ENHANCED: Filtering and Search with sorting
  get filteredIssues(): JiraIssue[] {
    let filtered = this.jiraIssues;

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(issue =>
        issue.summary.toLowerCase().includes(searchLower) ||
        issue.jiraKey.toLowerCase().includes(searchLower) ||
        issue.assigneeDisplayName?.toLowerCase().includes(searchLower)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(issue => issue.status === this.statusFilter);
    }

    if (this.priorityFilter) {
      filtered = filtered.filter(issue => issue.priority === this.priorityFilter);
    }

    if (this.assigneeFilter) {
      filtered = filtered.filter(issue => issue.assignee === this.assigneeFilter);
    }

    // Apply sorting
    if (this.sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[this.sortField as keyof JiraIssue];
        let bValue: any = b[this.sortField as keyof JiraIssue];

        // Handle special cases
        if (this.sortField === 'linkedTestCases') {
          aValue = a.linkedTestCases.length;
          bValue = b.linkedTestCases.length;
        }

        if (aValue < bValue) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }

  get paginatedIssues(): JiraIssue[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredIssues.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredIssues.length / this.itemsPerPage);
  }

  // Status and Priority helpers
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'bg-success';
      case 'in progress':
        return 'bg-warning';
      case 'to do':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'highest':
      case 'high':
        return 'bg-danger';
      case 'medium':
        return 'bg-warning';
      case 'low':
      case 'lowest':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  getAutomationStatusColor(status: string): string {
    switch (status) {
      case 'READY_TO_AUTOMATE':
        return 'bg-success';
      case 'NOT_AUTOMATABLE':
        return 'bg-danger';
      case 'PENDING':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }

  // Transform automation status for display
  getAutomationStatusDisplay(status: string): string {
    switch (status) {
      case 'READY_TO_AUTOMATE':
        return 'Ready to Automate';
      case 'NOT_AUTOMATABLE':
        return 'Not Automatable';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
    }
  }

  getSprintStateColor(state: string): string {
    switch (state?.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'future':
        return 'bg-info';
      case 'closed':
        return 'bg-secondary';
      default:
        return 'bg-warning';
    }
  }

  // Navigation
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Reset filters
  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.assigneeFilter = '';
    this.sortField = '';
    this.sortDirection = 'asc';
    this.currentPage = 1;
  }

  // Modal close handlers
  closeTestCaseModal(): void {
    this.showTestCaseModal = false;
    this.selectedTestCase = null;
    this.selectedIssue = null;
  }

  closeMappingModal(): void {
    this.showMappingModal = false;
    this.selectedTestCase = null;
    this.selectedProject = null;
    this.selectedTester = null;
  }

  closeKeywordModal(): void {
    this.showKeywordModal = false;
    this.selectedIssue = null;
    this.keywordSearchForm.reset();
  }

  // Get unique values for filters
  get uniqueStatuses(): string[] {
    const statuses = this.jiraIssues.map(issue => issue.status).filter(Boolean);
    return [...new Set(statuses)];
  }

  get uniquePriorities(): string[] {
    const priorities = this.jiraIssues.map(issue => issue.priority).filter(Boolean);
    return [...new Set(priorities)];
  }

  get uniqueAssignees(): string[] {
    const assignees = this.jiraIssues.map(issue => issue.assignee).filter(Boolean);
    return [...new Set(assignees)];
  }
}