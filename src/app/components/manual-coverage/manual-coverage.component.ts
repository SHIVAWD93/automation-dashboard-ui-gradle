import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { Domain } from "../../models/project.model"; // Add this import
import { PrimeTemplate } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { NgIf, NgFor, DatePipe } from "@angular/common";
import {
  JiraIssue,
  JiraTestCase,
  Project,
  Sprint,
  SprintStatistics,
  Tester,
} from "../../models/jira-testcase";
import { AppService } from "../../services/app.service";

@Component({
  selector: "app-manual-coverage",
  templateUrl: "./manual-coverage.component.html",
  styleUrls: ["./manual-coverage.component.scss"],
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    NgFor,
    DialogModule,
    PrimeTemplate,
    ReactiveFormsModule,
    DatePipe,
  ],
})
export class ManualCoverageComponent implements OnInit {
  Math = Math;

  // Statistics table properties
  statisticsTestCases: JiraTestCase[] = [];
  filteredStatisticsTestCases: JiraTestCase[] = [];
  paginatedStatisticsTestCases: JiraTestCase[] = [];

  // Statistics filters
  statisticsSearchTerm = "";
  statisticsStatusFilter = "";
  statisticsProjectFilter = "";

  // Statistics sorting
  statisticsSortField = "";
  statisticsSortDirection: "asc" | "desc" = "asc";

  // Statistics pagination
  statisticsCurrentPage = 1;
  statisticsItemsPerPage = 10;

  // Main data
  sprints: Sprint[] = [];

  selectedSprint: Sprint | null = null;

  jiraIssues: JiraIssue[] = [];

  projects: Project[] = [];

  domains: Domain[] = [];

  testers: Tester[] = [];

  sprintStatistics: SprintStatistics | null = null;

  // Enhanced test case modal properties
  selectedTestCaseProject: Project | null = null;
  selectedTestCaseTester: Tester | null = null;
  selectedTestCaseDomain: Domain | null = null;
  selectedTestCaseType: string | null = null;
  selectedToolType: string | null = null;
  selectedManualTesterId: number | null = null;
  // UI State
  loading = false;

  connectionStatus: { connected: boolean; message: string } | null = null;

  activeTab = "sprints";

  searchTerm = "";

  selectedProject: Project | null = null;

  selectedTester: Tester | null = null;

  keywordSearchForm: FormGroup;

  // NEW: Enhanced filters
  selectedDomain: Domain | null = null;

  selectedProjectForSprints: Project | null = null;

  showAllSprints = false; // Radio button state

  sortField = "";

  sortDirection: "asc" | "desc" = "asc";

  // Pagination
  currentPage = 1;

  itemsPerPage = 10;

  // Filters
  statusFilter = "";

  priorityFilter = "";

  assigneeFilter = "";

  // Modal states
  showTestCaseModal = false;

  showMappingModal = false;

  showKeywordModal = false;

  selectedTestCase: JiraTestCase | null = null;

  selectedIssue: JiraIssue | null = null;

  // Global search properties
  globalSearchKeyword = "";

  globalSearchLoading = false;

  globalSearchResult: {
    count: number;
    keyword: string;
    details?: any[];
    totalOccurrences?: number;
    totalCount?: number;
    matchingIssues?: any[];
  } | null = null;

  showGlobalSearchDetails = false;

  searchCurrentSprintOnly = false; // New property

  showTestCaseOptions: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private appService: AppService,
  ) {
    this.keywordSearchForm = this.fb.group({
      keyword: ["", [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    this.testConnection();
    this.loadInitialData();
    this.showTestCaseOptions =
      this.appService.hasWritePermission || this.appService.hasAdminPermission;
  }

  loadInitialData(): void {
    try {
      this.loadDomains();
      this.loadProjects();
      this.loadTesters();
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  // NEW: Load domains
  loadDomains(): void {
    this.apiService.getActiveDomains().subscribe(
      (domains: Domain[]) => {
        this.domains = domains;
      },
      (error) => {
        console.error("Error loading domains:", error);
      },
    );
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
        this.connectionStatus = {
          connected: false,
          message: "Connection failed",
        };
        this.loading = false;
        console.error("Connection test failed:", error);
      },
    );
  }

  // ENHANCED: Load sprints with project filtering
  loadSprints(): void {
    // Use selected project's Jira config if available
    const jiraProjectKey = this.selectedProjectForSprints?.jiraProjectKey;
    const jiraBoardId = this.selectedProjectForSprints?.jiraBoardId;

    this.apiService.getJiraSprints(jiraProjectKey, jiraBoardId).subscribe(
      (sprints: Sprint[]) => {
        this.sprints = sprints;

        // Auto-select active sprint by default
        if (!this.showAllSprints && sprints.length > 0) {
          const activeSprint = sprints.find(
            (s) => s.state.toLowerCase() === "active",
          );
          if (activeSprint) {
            this.selectSprint(activeSprint);
          }
        }
      },
      (error) => {
        console.error("Error loading sprints:", error);
      },
    );
  }

  loadProjects(): void {
    this.apiService.getManualPageProjects().subscribe(
      (projects: Project[]) => {
        this.projects = projects;
      },
      (error) => {
        console.error("Error loading projects:", error);
      },
    );
  }

  loadTesters(): void {
    this.apiService.getManualPageTesters().subscribe(
      (testers: Tester[]) => {
        this.testers = testers;
      },
      (error) => {
        console.error("Error loading testers:", error);
      },
    );
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
      const activeSprint = this.sprints.find(
        (s) => s.state.toLowerCase() === "active",
      );
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

    return this.projects.filter((p) => p.domain.id === this.selectedDomain!.id);
  }

  // Get filtered sprints
  get filteredSprints(): Sprint[] {
    if (this.showAllSprints) {
      return this.sprints;
    }

    return this.sprints.filter((s) => s.state.toLowerCase() === "active");
  }

  selectSprint(sprint: Sprint): void {
    if (this.selectedSprint?.id === sprint.id) {
      return; // Already selected
    }

    this.selectedSprint = sprint;
    this.activeTab = "issues";

    // First sync the issues, then load statistics after completion
    this.syncSprintIssues(sprint.id);
  }

  loadSprintStatistics(sprintId: string): void {
    this.apiService.getSprintStatistics(sprintId).subscribe(
      (stats: SprintStatistics) => {
        this.sprintStatistics = stats;
        // Load test cases for statistics table after getting statistics
        this.loadStatisticsTestCases(sprintId);
      },
      (error) => {
        console.error("Error loading sprint statistics:", error);
      },
    );
  }

  // NEW: Sorting functionality
  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortField = field;
      this.sortDirection = "asc";
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return "fas fa-sort";
    }

    return this.sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  }

  // Test Case Management
  openTestCaseModal(testCase: JiraTestCase, issue: JiraIssue): void {
    // Create a deep copy to avoid reference issues
    this.selectedTestCase = { ...testCase };
    this.selectedIssue = { ...issue };

    // Initialize dropdown selections with current values
    this.selectedTestCaseProject =
      this.projects.find((p) => p.id === testCase.projectId) || null;
    this.selectedTestCaseTester =
      this.testers.find((t) => t.id === testCase.assignedTesterId) || null;
    this.selectedTestCaseDomain =
      this.domains.find((d) => d.name === testCase.domainMapped) || null;

   // NEW: Initialize the missing dropdown values
   this.selectedTestCaseType = testCase.testCaseType || null;
   this.selectedToolType = testCase.toolType || null;
   this.selectedManualTesterId = testCase.manualTesterId || null;

   // Ensure automation status is properly set
   if (this.selectedTestCase && this.selectedTestCase.canBeAutomated) {
     this.selectedTestCase.automationStatus = "READY_TO_AUTOMATE";
   } else if (
     this.selectedTestCase &&
     this.selectedTestCase.cannotBeAutomated
   ) {
     this.selectedTestCase.automationStatus = "NOT_AUTOMATABLE";
   } else if (this.selectedTestCase) {
     this.selectedTestCase.automationStatus = "PENDING";
   }

   console.log("Opening test case modal with:", {
     testCase: this.selectedTestCase,
     project: this.selectedTestCaseProject,
     tester: this.selectedTestCaseTester,
     domain: this.selectedTestCaseDomain,
     testCaseType: this.selectedTestCaseType,
     toolType: this.selectedToolType,
     manualTesterId: this.selectedManualTesterId,
   });

   this.showTestCaseModal = true;
 }

  // Refresh test case data from the backend
  refreshTestCaseData(testCaseId: number): void {
    console.log("Refreshing test case data for ID:", testCaseId);

    this.apiService.getManualPageTestCaseById(testCaseId).subscribe(
      (freshData: any) => {
        console.log("Received fresh test case data:", freshData);

        // Update the selected test case with fresh data, ensuring required fields
        if (this.selectedTestCase) {
          this.selectedTestCase = {
            ...this.selectedTestCase,
            ...freshData,
            // Ensure required fields are present
            qtestTitle:
              freshData.qtestTitle ||
              this.selectedTestCase.qtestTitle ||
              "Untitled",
            canBeAutomated: freshData.canBeAutomated || false,
            cannotBeAutomated: freshData.cannotBeAutomated || false,
            automationStatus: freshData.automationStatus || "PENDING",
          };

          // Re-initialize dropdowns with fresh data
          this.selectedTestCaseProject =
            this.projects.find((p) => p.id === freshData.projectId) || null;
          this.selectedTestCaseTester =
            this.testers.find((t) => t.id === freshData.assignedTesterId) ||
            null;
          this.selectedTestCaseDomain =
            this.domains.find((d) => d.name === freshData.domainMapped) || null;

         // NEW: Re-initialize the missing dropdown values
         this.selectedTestCaseType = freshData.testCaseType || null;
         this.selectedToolType = freshData.toolType || null;
         this.selectedManualTesterId = freshData.manualTesterId || null;

         // Ensure automation status is properly set
         if (this.selectedTestCase && this.selectedTestCase.canBeAutomated) {
           this.selectedTestCase.automationStatus = "READY_TO_AUTOMATE";
         } else if (
           this.selectedTestCase &&
           this.selectedTestCase.cannotBeAutomated
         ) {
           this.selectedTestCase.automationStatus = "NOT_AUTOMATABLE";
         } else if (this.selectedTestCase) {
           this.selectedTestCase.automationStatus = "PENDING";
         }

         console.log("Test case data refreshed successfully:", {
           testCase: this.selectedTestCase,
           project: this.selectedTestCaseProject,
           tester: this.selectedTestCaseTester,
           domain: this.selectedTestCaseDomain,
           testCaseType: this.selectedTestCaseType,
           toolType: this.selectedToolType,
           manualTesterId: this.selectedManualTesterId,
         });
       }
     },
     (error) => {
       console.error("Error refreshing test case data:", error);
       // Don't fail the modal opening, just log the error
     },
   );
 }

  // New method to handle automation status changes without auto-closing modal
  onAutomationStatusChange(status: string): void {
    if (!this.selectedTestCase) {
      return;
    }

    let canBeAutomated = false;
    let cannotBeAutomated = false;

    switch (status) {
      case "can_automate":
        canBeAutomated = true;
        break;
      case "cannot_automate":
        cannotBeAutomated = true;
        break;
      case "pending":
        // Both remain false
        break;
    }

    // Update locally first for immediate UI feedback
    this.selectedTestCase.canBeAutomated = canBeAutomated;
    this.selectedTestCase.cannotBeAutomated = cannotBeAutomated;

    // Update automation status display
    if (canBeAutomated) {
      this.selectedTestCase.automationStatus = "READY_TO_AUTOMATE";
    } else if (cannotBeAutomated) {
      this.selectedTestCase.automationStatus = "NOT_AUTOMATABLE";
    } else {
      this.selectedTestCase.automationStatus = "PENDING";
    }
  }

  updateTestCaseAutomationFlags(
    canBeAutomated: boolean,
    cannotBeAutomated: boolean,
  ): void {
    if (!this.selectedTestCase) {
      return;
    }

    this.loading = true;
    this.apiService
      .updateTestCaseAutomationFlags(this.selectedTestCase.id, {
        canBeAutomated,
        cannotBeAutomated,
      })
      .subscribe(
        (updatedTestCase: JiraTestCase) => {
          this.updateLocalTestCase(updatedTestCase);
          // Don't auto-close modal
          this.loading = false;

          if (this.selectedSprint) {
            this.loadSprintStatistics(this.selectedSprint.id);
          }
        },
        (error) => {
          console.error("Error updating test case flags:", error);
          this.loading = false;
        },
      );
  }

  // Keyword Search
  openKeywordModal(issue: JiraIssue): void {
    this.selectedIssue = issue;
    this.showKeywordModal = true;
    this.keywordSearchForm.reset();
  }

  searchKeyword(): void {
    if (!this.selectedIssue || !this.keywordSearchForm.valid) {
      return;
    }

    const keyword = this.keywordSearchForm.get("keyword")?.value;
    this.loading = true;

    this.apiService
      .searchKeywordInComments(this.selectedIssue.jiraKey, { keyword })
      .subscribe(
        (updatedIssue: JiraIssue) => {
          const index = this.jiraIssues.findIndex(
            (i) => i.id === updatedIssue.id,
          );
          if (index !== -1) {
            this.jiraIssues[index] = updatedIssue;
          }
          this.showKeywordModal = false;
          this.loading = false;
        },
        (error) => {
          console.error("Error searching keyword:", error);
          this.loading = false;
        },
      );
  }

  // Utility methods with improved update logic
  updateLocalTestCase(updatedTestCase: JiraTestCase): void {
    let updated = false;

    for (const issue of this.jiraIssues) {
      const testCaseIndex = issue.linkedTestCases.findIndex(
        (tc) => tc.id === updatedTestCase.id,
      );
      if (testCaseIndex !== -1) {
        // Merge the updated data with existing data
        issue.linkedTestCases[testCaseIndex] = {
          ...issue.linkedTestCases[testCaseIndex],
          ...updatedTestCase,
        };
        updated = true;
        break;
      }
    }

    if (!updated) {
      console.warn(
        "Test case not found in local issues for update:",
        updatedTestCase.id,
      );
    }
  }

  // ENHANCED: Filtering and Search with sorting
  get filteredIssues(): JiraIssue[] {
    let filtered = this.jiraIssues;

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.summary.toLowerCase().includes(searchLower) ||
          issue.jiraKey.toLowerCase().includes(searchLower) ||
          issue.assigneeDisplayName?.toLowerCase().includes(searchLower),
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter((issue) => issue.status === this.statusFilter);
    }

    if (this.priorityFilter) {
      filtered = filtered.filter(
        (issue) => issue.priority === this.priorityFilter,
      );
    }

    if (this.assigneeFilter) {
      filtered = filtered.filter(
        (issue) => issue.assignee === this.assigneeFilter,
      );
    }

    // Apply sorting
    if (this.sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[this.sortField as keyof JiraIssue];
        let bValue: any = b[this.sortField as keyof JiraIssue];

        // Handle special cases
        if (this.sortField === "linkedTestCases") {
          aValue = a.linkedTestCases.length;
          bValue = b.linkedTestCases.length;
        }

        if (aValue < bValue) {
          return this.sortDirection === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return this.sortDirection === "asc" ? 1 : -1;
        }

        return 0;
      });
    }

    return filtered;
  }

  get paginatedIssues(): JiraIssue[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;

    return this.filteredIssues.slice(
      startIndex,
      startIndex + this.itemsPerPage,
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredIssues.length / this.itemsPerPage);
  }

  // Status and Priority helpers
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case "done":
      case "completed":
        return "bg-success";
      case "in progress":
        return "bg-warning";
      case "to do":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case "highest":
      case "high":
        return "bg-danger";
      case "medium":
        return "bg-warning";
      case "low":
      case "lowest":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  }

  getAutomationStatusColor(status: string): string {
    switch (status) {
      case "READY_TO_AUTOMATE":
        return "bg-success";
      case "NOT_AUTOMATABLE":
        return "bg-danger";
      case "PENDING":
        return "bg-warning";
      default:
        return "bg-secondary";
    }
  }

  // Transform automation status for display
  getAutomationStatusDisplay(status: string): string {
    switch (status) {
      case "READY_TO_AUTOMATE":
        return "Ready to Automate";
      case "NOT_AUTOMATABLE":
        return "Not Automatable";
      case "PENDING":
        return "Pending";
      default:
        return status;
    }
  }

  getSprintStateColor(state: string): string {
    switch (state?.toLowerCase()) {
      case "active":
        return "bg-success";
      case "future":
        return "bg-info";
      case "closed":
        return "bg-secondary";
      default:
        return "bg-warning";
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
    this.searchTerm = "";
    this.statusFilter = "";
    this.priorityFilter = "";
    this.assigneeFilter = "";
    this.sortField = "";
    this.sortDirection = "asc";
    this.currentPage = 1;
  }

  // Enhanced test case information save functionality with better state management
  saveTestCaseInformation(): void {
    if (!this.selectedTestCase || this.loading) {
      return; // Prevent double-clicking
    }

    this.loading = true;
    const testCaseId = this.selectedTestCase.id;

    this.apiService
      .saveManualTestCase(
        this.selectedTestCase.id,
        this.selectedTestCase.canBeAutomated,
        this.selectedTestCase.cannotBeAutomated,
        this.selectedTestCaseProject?.id,
        this.selectedTestCaseTester?.id,
        this.selectedTestCaseDomain?.id,
        this.selectedTestCaseType,
        this.selectedToolType,
        this.selectedManualTesterId,
      )
      .subscribe({
        next: (value) => {
          console.log(value);
          this.loading = false;
          this.showTestCaseModal = false;
          this.syncSprintIssues(this.selectedSprint?.id as string);
        },
      });
  }

  // Helper method to check if test case information has changed
  hasInfoChanges(): boolean {
    if (!this.selectedTestCase) {
      return false;
    }

    const currentProject = this.projects.find(
      (p) => p.id === this.selectedTestCase!.projectId,
    );
    const currentTester = this.testers.find(
      (t) => t.id === this.selectedTestCase!.assignedTesterId,
    );
    const currentDomain = this.domains.find(
      (d) => d.name === this.selectedTestCase!.domainMapped,
    );

    const hasProjectChanged = this.selectedTestCaseProject !== currentProject;
    const hasTesterChanged = this.selectedTestCaseTester !== currentTester;
    const hasDomainChanged = this.selectedTestCaseDomain !== currentDomain;

    console.log("Checking info changes:", {
      current: {
        project: currentProject?.id,
        tester: currentTester?.id,
        domain: currentDomain?.name,
      },
      selected: {
        project: this.selectedTestCaseProject?.id,
        tester: this.selectedTestCaseTester?.id,
        domain: this.selectedTestCaseDomain?.name,
      },
      changes: {
        project: hasProjectChanged,
        tester: hasTesterChanged,
        domain: hasDomainChanged,
      },
    });

    return hasProjectChanged || hasTesterChanged || hasDomainChanged;
  }

  hasTestCaseChanges(): boolean {
    if (!this.selectedTestCase) {
      return false;
    }

    // Always return true since we always want to be able to save automation status or info changes
    return true;
  }

  // Modal close handlers
  closeTestCaseModal(): void {
    this.showTestCaseModal = false;
    this.selectedTestCase = null;
    this.selectedIssue = null;

    // Reset dropdown selections
    this.selectedTestCaseProject = null;
    this.selectedTestCaseTester = null;
    this.selectedTestCaseDomain = null;
  }

  closeKeywordModal(): void {
    this.showKeywordModal = false;
    this.selectedIssue = null;
    this.keywordSearchForm.reset();
  }

  // Get unique values for filters
  get uniqueStatuses(): string[] {
    const statuses = this.jiraIssues
      .map((issue) => issue.status)
      .filter(Boolean);

    return [...new Set(statuses)];
  }

  get uniquePriorities(): string[] {
    const priorities = this.jiraIssues
      .map((issue) => issue.priority)
      .filter(Boolean);

    return [...new Set(priorities)];
  }

  get uniqueAssignees(): string[] {
    const assignees = this.jiraIssues
      .map((issue) => issue.assignee)
      .filter(Boolean);

    return [...new Set(assignees)];
  }

  // Global search functionality
  performGlobalSearch() {
    if (
      !this.globalSearchKeyword ||
      this.globalSearchKeyword.trim().length < 3
    ) {
      return;
    }

    this.globalSearchLoading = true;
    this.globalSearchResult = null;
    this.showGlobalSearchDetails = false;

    // Use the existing global keyword search endpoint
    const sprintIdToUse =
      this.searchCurrentSprintOnly && this.selectedSprint
        ? this.selectedSprint.id
        : undefined;
    this.apiService
      .globalKeywordSearch(
        this.globalSearchKeyword.trim(),
        this.selectedProjectForSprints?.jiraProjectKey,
        sprintIdToUse,
      )
      .subscribe(
        (result) => {
          console.log("Global search result:", result);

          // Parse the new response format
          const totalOccurrences = result.totalOccurrences || 0;
          const totalCount = result.totalCount || 0;
          const matchingIssues = result.matchingIssues || [];

          this.globalSearchResult = {
            count: totalOccurrences, // Use totalOccurrences for the main count
            keyword: this.globalSearchKeyword.trim(),
            details: matchingIssues,
            totalOccurrences,
            totalCount,
            matchingIssues,
          };

          this.globalSearchLoading = false;

          // Auto-switch to statistics tab if there are results to show the full table
          if (totalOccurrences > 0 && this.activeTab !== "statistics") {
            setTimeout(() => {
              this.setActiveTab("statistics");
            }, 1000); // Small delay to let user see the summary first
          }

          // Don't auto-hide if there are results to show
          if (totalOccurrences === 0) {
            setTimeout(() => {
              this.globalSearchResult = null;
            }, 3000);
          }
        },
        (error) => {
          console.error("Global search error:", error);
          this.globalSearchLoading = false;

          // Show a message even on error
          this.globalSearchResult = {
            count: 0,
            keyword: this.globalSearchKeyword.trim(),
          };

          // Auto-hide error after 3 seconds
          setTimeout(() => {
            this.globalSearchResult = null;
          }, 3000);
        },
      );
  }

  // Toggle global search details view
  toggleGlobalSearchDetails() {
    this.showGlobalSearchDetails = !this.showGlobalSearchDetails;
  }

  // Clear global search results
  clearGlobalSearchResults() {
    this.globalSearchResult = null;
    this.showGlobalSearchDetails = false;
  }

  // Apply filters to statistics test cases
  applyStatisticsFilters(): void {
    let filtered = this.statisticsTestCases;

    // Apply search filter
    if (this.statisticsSearchTerm.trim()) {
      const searchLower = this.statisticsSearchTerm.toLowerCase();
      filtered = filtered.filter(tc =>
        tc.qtestTitle?.toLowerCase().includes(searchLower) ||
        tc.projectName?.toLowerCase().includes(searchLower) ||
        tc.assignedTesterName?.toLowerCase().includes(searchLower) ||
        tc.manualTesterName?.toLowerCase().includes(searchLower) ||
        tc.relatedJiraKey?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (this.statisticsStatusFilter) {
      filtered = filtered.filter(tc => tc.automationStatus === this.statisticsStatusFilter);
    }

    // Apply project filter
    if (this.statisticsProjectFilter) {
      filtered = filtered.filter(tc => tc.projectId === parseInt(this.statisticsProjectFilter));
    }

    this.filteredStatisticsTestCases = filtered;
    this.statisticsCurrentPage = 1; // Reset to first page when filtering
    this.updateStatisticsPagination();
  }

  // Reset statistics filters
  resetStatisticsFilters(): void {
    this.statisticsSearchTerm = "";
    this.statisticsStatusFilter = "";
    this.statisticsProjectFilter = "";
    this.statisticsSortField = "";
    this.statisticsSortDirection = "asc";
    this.statisticsCurrentPage = 1;
    this.applyStatisticsFilters();
  }

  // Sort statistics table
  sortStatisticsTable(column: string): void {
    if (this.statisticsSortField === column) {
      this.statisticsSortDirection = this.statisticsSortDirection === "asc" ? "desc" : "asc";
    } else {
      this.statisticsSortField = column;
      this.statisticsSortDirection = "asc";
    }

    this.filteredStatisticsTestCases.sort((a, b) => {
      let aVal: any = a[column as keyof JiraTestCase];
      let bVal: any = b[column as keyof JiraTestCase];

      // Handle null/undefined values
      if (!aVal && !bVal) return 0;
      if (!aVal) return this.statisticsSortDirection === "asc" ? 1 : -1;
      if (!bVal) return this.statisticsSortDirection === "asc" ? -1 : 1;

      // Convert to strings for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (this.statisticsSortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    this.updateStatisticsPagination();
  }

  // Get sort icon for statistics table
  getStatisticsSortIcon(column: string): string {
    if (this.statisticsSortField !== column) {
      return "fas fa-sort text-muted";
    }
    return this.statisticsSortDirection === "asc" ? "fas fa-sort-up text-primary" : "fas fa-sort-down text-primary";
  }

  // Update pagination for statistics
  updateStatisticsPagination(): void {
    const startIndex = (this.statisticsCurrentPage - 1) * this.statisticsItemsPerPage;
    this.paginatedStatisticsTestCases = this.filteredStatisticsTestCases.slice(
      startIndex,
      startIndex + this.statisticsItemsPerPage
    );
  }

  // Get total pages for statistics pagination
  get statisticsTotalPages(): number {
    return Math.ceil(this.filteredStatisticsTestCases.length / this.statisticsItemsPerPage);
  }

  // Navigate to specific page in statistics
  goToStatisticsPage(page: number): void {
    if (page >= 1 && page <= this.statisticsTotalPages) {
      this.statisticsCurrentPage = page;
      this.updateStatisticsPagination();
    }
  }

  // Track by function for statistics test cases
  trackByStatisticsTestCase(index: number, testCase: JiraTestCase): number {
    return testCase.id;
  }

  // Update the syncSprintIssues method to load statistics test cases
  syncSprintIssues(sprintId: string): void {
    this.loading = true;

    // Use selected project's Jira config if available
    const jiraProjectKey = this.selectedProjectForSprints?.jiraProjectKey;
    const jiraBoardId = this.selectedProjectForSprints?.jiraBoardId;

    this.apiService
      .syncSprintIssues(sprintId, jiraProjectKey, jiraBoardId)
      .subscribe(
        (issues: JiraIssue[]) => {
          this.jiraIssues = issues;
          this.loading = false;

          // Load statistics AFTER issues are synced successfully
          this.loadSprintStatistics(sprintId);
        },
        (error) => {
          console.error("Error syncing sprint issues:", error);
          this.loading = false;
          // Don't load statistics if syncing failed
        },
      );
  }

  // Statistics Modal Properties
  showStatisticsTestCaseModal = false;
  showTestCaseDetailsModal = false;
  selectedStatisticsTestCase: JiraTestCase | null = null;
  selectedDetailsTestCase: JiraTestCase | null = null;

  // Statistics Test Case Modal Form Data
  selectedStatisticsTestCaseProject: Project | null = null;
  selectedStatisticsTestCaseTester: Tester | null = null;
  selectedStatisticsTestCaseDomain: Domain | null = null;
  selectedStatisticsTestCaseType: string | null = null;
  selectedStatisticsToolType: string | null = null;
  selectedStatisticsManualTesterId: number | null = null;

  // Add these methods to the ManualCoverageComponent class

  /**
   * Opens the edit modal for a test case from the statistics table
   */
  openStatisticsTestCaseModal(testCase: JiraTestCase): void {
    // Create a deep copy to avoid reference issues
    this.selectedStatisticsTestCase = { ...testCase };

    // Initialize dropdown selections with current values
    this.selectedStatisticsTestCaseProject =
      this.projects.find((p) => p.id === testCase.projectId) || null;
    this.selectedStatisticsTestCaseTester =
      this.testers.find((t) => t.id === testCase.assignedTesterId) || null;
    this.selectedStatisticsTestCaseDomain =
      this.domains.find((d) => d.name === testCase.domainMapped) || null;

    // Initialize the dropdown values
    this.selectedStatisticsTestCaseType = testCase.testCaseType || null;
    this.selectedStatisticsToolType = testCase.toolType || null;
    this.selectedStatisticsManualTesterId = testCase.manualTesterId || null;

    // Ensure automation status is properly set
    if (this.selectedStatisticsTestCase && this.selectedStatisticsTestCase.canBeAutomated) {
      this.selectedStatisticsTestCase.automationStatus = "READY_TO_AUTOMATE";
    } else if (
      this.selectedStatisticsTestCase &&
      this.selectedStatisticsTestCase.cannotBeAutomated
    ) {
      this.selectedStatisticsTestCase.automationStatus = "NOT_AUTOMATABLE";
    } else if (this.selectedStatisticsTestCase) {
      this.selectedStatisticsTestCase.automationStatus = "PENDING";
    }

    console.log("Opening statistics test case modal with:", {
      testCase: this.selectedStatisticsTestCase,
      project: this.selectedStatisticsTestCaseProject,
      tester: this.selectedStatisticsTestCaseTester,
      domain: this.selectedStatisticsTestCaseDomain,
      testCaseType: this.selectedStatisticsTestCaseType,
      toolType: this.selectedStatisticsToolType,
      manualTesterId: this.selectedStatisticsManualTesterId,
    });

    this.showStatisticsTestCaseModal = true;
  }

  /**
   * Opens the details view modal for a test case
   */
  viewTestCaseDetails(testCase: JiraTestCase): void {
    this.selectedDetailsTestCase = { ...testCase };
    this.showTestCaseDetailsModal = true;
  }

  /**
   * Handles automation status changes in the statistics modal
   */
  onStatisticsAutomationStatusChange(status: string): void {
    if (!this.selectedStatisticsTestCase) {
      return;
    }

    let canBeAutomated = false;
    let cannotBeAutomated = false;

    switch (status) {
      case "can_automate":
        canBeAutomated = true;
        break;
      case "cannot_automate":
        cannotBeAutomated = true;
        break;
      case "pending":
        // Both remain false
        break;
    }

    // Update locally first for immediate UI feedback
    this.selectedStatisticsTestCase.canBeAutomated = canBeAutomated;
    this.selectedStatisticsTestCase.cannotBeAutomated = cannotBeAutomated;

    // Update automation status display
    if (canBeAutomated) {
      this.selectedStatisticsTestCase.automationStatus = "READY_TO_AUTOMATE";
    } else if (cannotBeAutomated) {
      this.selectedStatisticsTestCase.automationStatus = "NOT_AUTOMATABLE";
    } else {
      this.selectedStatisticsTestCase.automationStatus = "PENDING";
    }
  }

  /**
   * Saves test case information from the statistics modal
   */
  saveStatisticsTestCaseInformation(): void {
    if (!this.selectedStatisticsTestCase || this.loading) {
      return; // Prevent double-clicking
    }

    this.loading = true;
    const testCaseId = this.selectedStatisticsTestCase.id;

    this.apiService
      .saveManualTestCase(
        this.selectedStatisticsTestCase.id,
        this.selectedStatisticsTestCase.canBeAutomated,
        this.selectedStatisticsTestCase.cannotBeAutomated,
        this.selectedStatisticsTestCaseProject?.id,
        this.selectedStatisticsTestCaseTester?.id,
        this.selectedStatisticsTestCaseDomain?.id,
        this.selectedStatisticsTestCaseType,
        this.selectedStatisticsToolType,
        this.selectedStatisticsManualTesterId,
      )
      .subscribe({
        next: (response) => {
          console.log("Statistics test case saved successfully:", response);
          this.loading = false;
          this.showStatisticsTestCaseModal = false;

          // Refresh the data to reflect changes
          if (this.selectedSprint) {
            this.syncSprintIssues(this.selectedSprint.id);
          }

          // Show success message (optional)
          // this.showSuccessMessage('Test case updated successfully');
        },
        error: (error) => {
          console.error("Error saving statistics test case:", error);
          this.loading = false;
          // Show error message (optional)
          // this.showErrorMessage('Failed to update test case');
        }
      });
  }

  /**
   * Helper method to check if statistics test case information has changed
   */
  hasStatisticsTestCaseChanges(): boolean {
    if (!this.selectedStatisticsTestCase) {
      return false;
    }

    const currentProject = this.projects.find(
      (p) => p.id === this.selectedStatisticsTestCase!.projectId,
    );
    const currentTester = this.testers.find(
      (t) => t.id === this.selectedStatisticsTestCase!.assignedTesterId,
    );
    const currentDomain = this.domains.find(
      (d) => d.name === this.selectedStatisticsTestCase!.domainMapped,
    );

    const hasProjectChanged = this.selectedStatisticsTestCaseProject !== currentProject;
    const hasTesterChanged = this.selectedStatisticsTestCaseTester !== currentTester;
    const hasDomainChanged = this.selectedStatisticsTestCaseDomain !== currentDomain;
    const hasTestCaseTypeChanged = this.selectedStatisticsTestCaseType !== this.selectedStatisticsTestCase.testCaseType;
    const hasToolTypeChanged = this.selectedStatisticsToolType !== this.selectedStatisticsTestCase.toolType;
    const hasManualTesterChanged = this.selectedStatisticsManualTesterId !== this.selectedStatisticsTestCase.manualTesterId;

    // Check automation status changes
    const originalCanBeAutomated = this.selectedStatisticsTestCase.canBeAutomated || false;
    const originalCannotBeAutomated = this.selectedStatisticsTestCase.cannotBeAutomated || false;

    // Get the original test case from the statistics list to compare
    const originalTestCase = this.statisticsTestCases.find(tc => tc.id === this.selectedStatisticsTestCase!.id);
    const hasAutomationStatusChanged = originalTestCase && (
      originalTestCase.canBeAutomated !== originalCanBeAutomated ||
      originalTestCase.cannotBeAutomated !== originalCannotBeAutomated
    );

    console.log("Checking statistics test case changes:", {
      current: {
        project: currentProject?.id,
        tester: currentTester?.id,
        domain: currentDomain?.name,
        testCaseType: this.selectedStatisticsTestCase.testCaseType,
        toolType: this.selectedStatisticsTestCase.toolType,
        manualTesterId: this.selectedStatisticsTestCase.manualTesterId,
      },
      selected: {
        project: this.selectedStatisticsTestCaseProject?.id,
        tester: this.selectedStatisticsTestCaseTester?.id,
        domain: this.selectedStatisticsTestCaseDomain?.name,
        testCaseType: this.selectedStatisticsTestCaseType,
        toolType: this.selectedStatisticsToolType,
        manualTesterId: this.selectedStatisticsManualTesterId,
      },
      changes: {
        project: hasProjectChanged,
        tester: hasTesterChanged,
        domain: hasDomainChanged,
        testCaseType: hasTestCaseTypeChanged,
        toolType: hasToolTypeChanged,
        manualTester: hasManualTesterChanged,
        automationStatus: hasAutomationStatusChanged,
      },
    });

    return (
      hasProjectChanged ||
      hasTesterChanged ||
      hasDomainChanged ||
      hasTestCaseTypeChanged ||
      hasToolTypeChanged ||
      hasManualTesterChanged ||
      hasAutomationStatusChanged ||
      true // Always allow saving for automation status changes
    );
  }

  /**
   * Closes the statistics test case modal
   */
  closeStatisticsTestCaseModal(): void {
    this.showStatisticsTestCaseModal = false;
    this.selectedStatisticsTestCase = null;

    // Reset dropdown selections
    this.selectedStatisticsTestCaseProject = null;
    this.selectedStatisticsTestCaseTester = null;
    this.selectedStatisticsTestCaseDomain = null;
    this.selectedStatisticsTestCaseType = null;
    this.selectedStatisticsToolType = null;
    this.selectedStatisticsManualTesterId = null;
  }

  /**
   * Closes the test case details modal
   */
  closeTestCaseDetailsModal(): void {
    this.showTestCaseDetailsModal = false;
    this.selectedDetailsTestCase = null;
  }

  /**
   * Opens edit modal from the details view
   */
  editFromDetailsView(): void {
    if (this.selectedDetailsTestCase) {
      // Close details modal
      this.closeTestCaseDetailsModal();

      // Open edit modal with the same test case
      setTimeout(() => {
        this.openStatisticsTestCaseModal(this.selectedDetailsTestCase!);
      }, 100);
    }
  }

  /**
   * Update the loadStatisticsTestCases method to ensure proper data structure
   */
  loadStatisticsTestCases(sprintId: string): void {
    // Extract all test cases from jira issues
    this.statisticsTestCases = [];

    this.jiraIssues.forEach(issue => {
      issue.linkedTestCases.forEach(testCase => {
        // Add related JIRA key to test case for display using the enhanced interface
        const enhancedTestCase: JiraTestCase = {
          ...testCase,
          relatedJiraKey: issue.jiraKey,
          relatedJiraSummary: issue.summary
        };
        this.statisticsTestCases.push(enhancedTestCase);
      });
    });

    // Apply initial filters and pagination
    this.applyStatisticsFilters();
  }

  /**
   * Enhanced update method for statistics test cases after save
   */
  updateStatisticsTestCase(updatedTestCase: JiraTestCase): void {
    // Update in statistics test cases array
    const statisticsIndex = this.statisticsTestCases.findIndex(
      (tc) => tc.id === updatedTestCase.id
    );
    if (statisticsIndex !== -1) {
      this.statisticsTestCases[statisticsIndex] = {
        ...this.statisticsTestCases[statisticsIndex],
        ...updatedTestCase,
      };
    }

    // Update in the main jira issues array as well
    this.updateLocalTestCase(updatedTestCase);

    // Reapply filters to show updated data
    this.applyStatisticsFilters();
  }

}