import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Domain } from '../../models/domain.model';
import { Project } from '../../models/project.model';
import { Tester } from '../../models/tester.model';

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

// Use shared models instead of local duplicates

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
  
  // Enhanced test case modal properties
  selectedTestCaseProject: Project | null = null;
  selectedTestCaseTester: Tester | null = null;
  selectedTestCaseDomain: Domain | null = null;

  // Global search properties
  globalSearchKeyword: string = '';
  globalSearchLoading: boolean = false;
  globalSearchResult: { 
    count: number; 
    keyword: string; 
    details?: any[];
    totalOccurrences?: number;
    totalCount?: number;
    matchingIssues?: any[];
  } | null = null;
  showGlobalSearchDetails: boolean = false;
  searchCurrentSprintOnly: boolean = false; // New property

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
      
      // Don't load sprints automatically - wait for user selection
      console.log('Initial data loaded. Sprints will be loaded when domain/project is selected.');
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
    return this.projects.filter(p => p.domain.id === this.selectedDomain!.id);
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
    this.activeTab = 'issues';

    // First sync the issues, then load statistics after completion
    this.syncSprintIssues(sprint.id);
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

        // Load statistics AFTER issues are synced successfully
        this.loadSprintStatistics(sprintId);
      },
      (error) => {
        console.error('Error syncing sprint issues:', error);
        this.loading = false;
        // Don't load statistics if syncing failed
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
    // Create a deep copy to avoid reference issues
    this.selectedTestCase = { ...testCase };
    this.selectedIssue = { ...issue };
    
    // Initialize dropdown selections with current values
    this.selectedTestCaseProject = this.projects.find(p => p.id === testCase.projectId) || null;
    this.selectedTestCaseTester = this.testers.find(t => t.id === testCase.assignedTesterId) || null;
    this.selectedTestCaseDomain = this.domains.find(d => d.name === testCase.domainMapped) || null;
    
    // Ensure automation status is properly set
    if (this.selectedTestCase && this.selectedTestCase.canBeAutomated) {
      this.selectedTestCase.automationStatus = 'READY_TO_AUTOMATE';
    } else if (this.selectedTestCase && this.selectedTestCase.cannotBeAutomated) {
      this.selectedTestCase.automationStatus = 'NOT_AUTOMATABLE';
    } else if (this.selectedTestCase) {
      this.selectedTestCase.automationStatus = 'PENDING';
    }
    
    console.log('Opening test case modal with:', {
      testCase: this.selectedTestCase,
      project: this.selectedTestCaseProject,
      tester: this.selectedTestCaseTester,
      domain: this.selectedTestCaseDomain
    });
    
    this.showTestCaseModal = true;
    
    // this.refreshTestCaseData(testCase.id);
  }

  // Refresh test case data from the backend
  refreshTestCaseData(testCaseId: number): void {
    console.log('Refreshing test case data for ID:', testCaseId);
    
    this.apiService.getManualPageTestCaseById(testCaseId).subscribe(
      (freshData: any) => {
        console.log('Received fresh test case data:', freshData);
        
        // Update the selected test case with fresh data, ensuring required fields
        if (this.selectedTestCase) {
          this.selectedTestCase = { 
            ...this.selectedTestCase, 
            ...freshData,
            // Ensure required fields are present
            qtestTitle: freshData.qtestTitle || this.selectedTestCase.qtestTitle || 'Untitled',
            canBeAutomated: freshData.canBeAutomated || false,
            cannotBeAutomated: freshData.cannotBeAutomated || false,
            automationStatus: freshData.automationStatus || 'PENDING'
          };
          
          // Re-initialize dropdowns with fresh data
          this.selectedTestCaseProject = this.projects.find(p => p.id === freshData.projectId) || null;
          this.selectedTestCaseTester = this.testers.find(t => t.id === freshData.assignedTesterId) || null;
          this.selectedTestCaseDomain = this.domains.find(d => d.name === freshData.domainMapped) || null;
          
          // Ensure automation status is properly set
          if (this.selectedTestCase && this.selectedTestCase.canBeAutomated) {
            this.selectedTestCase.automationStatus = 'READY_TO_AUTOMATE';
          } else if (this.selectedTestCase && this.selectedTestCase.cannotBeAutomated) {
            this.selectedTestCase.automationStatus = 'NOT_AUTOMATABLE';
          } else if (this.selectedTestCase) {
            this.selectedTestCase.automationStatus = 'PENDING';
          }
          
          console.log('Test case data refreshed successfully:', {
            testCase: this.selectedTestCase,
            project: this.selectedTestCaseProject,
            tester: this.selectedTestCaseTester,
            domain: this.selectedTestCaseDomain
          });
        }
      },
      (error) => {
        console.error('Error refreshing test case data:', error);
        // Don't fail the modal opening, just log the error
      }
    );
  }

  // New method to handle automation status changes without auto-closing modal
  onAutomationStatusChange(status: string): void {
    if (!this.selectedTestCase) return;

    let canBeAutomated = false;
    let cannotBeAutomated = false;

    switch (status) {
      case 'can_automate':
        canBeAutomated = true;
        break;
      case 'cannot_automate':
        cannotBeAutomated = true;
        break;
      case 'pending':
        // Both remain false
        break;
    }

    // Update locally first for immediate UI feedback
    this.selectedTestCase.canBeAutomated = canBeAutomated;
    this.selectedTestCase.cannotBeAutomated = cannotBeAutomated;
    
    // Update automation status display
    if (canBeAutomated) {
      this.selectedTestCase.automationStatus = 'READY_TO_AUTOMATE';
    } else if (cannotBeAutomated) {
      this.selectedTestCase.automationStatus = 'NOT_AUTOMATABLE';
    } else {
      this.selectedTestCase.automationStatus = 'PENDING';
    }
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
        // Don't auto-close modal
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

  // Utility methods with improved update logic
  updateLocalTestCase(updatedTestCase: JiraTestCase): void {
    let updated = false;
    
    for (const issue of this.jiraIssues) {
      const testCaseIndex = issue.linkedTestCases.findIndex(tc => tc.id === updatedTestCase.id);
      if (testCaseIndex !== -1) {
        // Merge the updated data with existing data
        issue.linkedTestCases[testCaseIndex] = {
          ...issue.linkedTestCases[testCaseIndex],
          ...updatedTestCase
        };
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      console.warn('Test case not found in local issues for update:', updatedTestCase.id);
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

  // Enhanced test case information save functionality with better state management
  saveTestCaseInformation(): void {
    if (!this.selectedTestCase || this.loading) {
      return; // Prevent double-clicking
    }

    this.loading = true;
    const testCaseId = this.selectedTestCase.id;
    
    // console.log('Saving test case information:', {
    //   testCaseId,
    //   automationFlags: {
    //     canBeAutomated: this.selectedTestCase.canBeAutomated,
    //     cannotBeAutomated: this.selectedTestCase.cannotBeAutomated
    //   },
    //   hasInfoChanges: this.hasInfoChanges(),
    //   infoChanges: {
    //     projectId: this.selectedTestCaseProject?.id || null,
    //     testerId: this.selectedTestCaseTester?.id || null,
    //     domainId: this.selectedTestCaseDomain?.id || null
    //   }
    // });
    
    // // Prepare all updates to be saved together
    // const updates = [];
    
    // // Add automation flags update
    // updates.push(
    //   this.apiService.updateTestCaseAutomationFlags(testCaseId, {
    //     canBeAutomated: this.selectedTestCase.canBeAutomated,
    //     cannotBeAutomated: this.selectedTestCase.cannotBeAutomated
    //   }).toPromise()
    // );
    
    // // Add test case information update if there are changes
    // if (this.hasInfoChanges()) {
    //   const updateData = {
    //     projectId: this.selectedTestCaseProject?.id || null,
    //     testerId: this.selectedTestCaseTester?.id || null,
    //     domainId: this.selectedTestCaseDomain?.id || null
    //   };
      
    //   console.log('Sending mapping update:', updateData);
      
    //   updates.push(
    //     this.apiService.updateTestCaseInformation(testCaseId, updateData).toPromise()
    //   );
    // }
    
    // // Execute all updates in parallel
    // Promise.all(updates)
    //   .then((results) => {
    //     console.log('All updates completed successfully:', results);
        
    //     // Update local test case with results
    //     results.forEach((result) => {
    //       if (result) {
    //         this.updateLocalTestCase(result);
            
    //         // Update selected test case for immediate UI feedback
    //         if (this.selectedTestCase && this.selectedTestCase.id === testCaseId) {
    //           this.selectedTestCase = { ...this.selectedTestCase, ...result };
    //         }
    //       }
    //     });
        
    //     this.loading = false;
        
    //     // Refresh statistics
    //     if (this.selectedSprint) {
    //       this.loadSprintStatistics(this.selectedSprint.id);
    //     }
        
    //     // Close the modal after successful save
    //     this.closeTestCaseModal();
        
    //     // Show success message
    //     console.log('Test case updated successfully');
    //   })
    //   .catch((error) => {
    //     console.error('Error saving test case:', error);
    //     this.loading = false;
        
    //     // Show user-friendly error message
    //     alert(`Error saving test case: ${error.message || 'Please try again.'}`);
    //   });

      this.apiService.saveManualTestCase(this.selectedTestCase.id,
        this.selectedTestCase.canBeAutomated, 
        this.selectedTestCase.cannotBeAutomated,
         this.selectedTestCaseProject?.id,
        this.selectedTestCaseTester?.id,
      this.selectedDomain?.id).subscribe(
     {
      next:(value)=> {
        console.log(value)
        this.loading = false;
        this.showTestCaseModal = false;
      },
     }
      )
  }

  // Helper method to check if test case information has changed
  hasInfoChanges(): boolean {
    if (!this.selectedTestCase) {
      return false;
    }

    const currentProject = this.projects.find(p => p.id === this.selectedTestCase!.projectId);
    const currentTester = this.testers.find(t => t.id === this.selectedTestCase!.assignedTesterId);
    const currentDomain = this.domains.find(d => d.name === this.selectedTestCase!.domainMapped);

    const hasProjectChanged = this.selectedTestCaseProject !== currentProject;
    const hasTesterChanged = this.selectedTestCaseTester !== currentTester;
    const hasDomainChanged = this.selectedTestCaseDomain !== currentDomain;

    console.log('Checking info changes:', {
      current: {
        project: currentProject?.id,
        tester: currentTester?.id,
        domain: currentDomain?.name
      },
      selected: {
        project: this.selectedTestCaseProject?.id,
        tester: this.selectedTestCaseTester?.id,
        domain: this.selectedTestCaseDomain?.name
      },
      changes: {
        project: hasProjectChanged,
        tester: hasTesterChanged,
        domain: hasDomainChanged
      }
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

  // Global search functionality
  performGlobalSearch() {
    if (!this.globalSearchKeyword || this.globalSearchKeyword.trim().length < 3) {
      return;
    }
    
    this.globalSearchLoading = true;
    this.globalSearchResult = null;
    this.showGlobalSearchDetails = false;
    
    // Use the existing global keyword search endpoint
    const sprintIdToUse = this.searchCurrentSprintOnly && this.selectedSprint ? this.selectedSprint.id : undefined;
    this.apiService.globalKeywordSearch(this.globalSearchKeyword.trim(), this.selectedProjectForSprints?.jiraProjectKey, sprintIdToUse).subscribe(
      (result) => {
        console.log('Global search result:', result);
        
        // Parse the new response format
        const totalOccurrences = result.totalOccurrences || 0;
        const totalCount = result.totalCount || 0;
        const matchingIssues = result.matchingIssues || [];
        
        this.globalSearchResult = { 
          count: totalOccurrences, // Use totalOccurrences for the main count
          keyword: this.globalSearchKeyword.trim(),
          details: matchingIssues,
          totalOccurrences: totalOccurrences,
          totalCount: totalCount,
          matchingIssues: matchingIssues
        };
        
        this.globalSearchLoading = false;
        
        // Auto-switch to statistics tab if there are results to show the full table
        if (totalOccurrences > 0 && this.activeTab !== 'statistics') {
          setTimeout(() => {
            this.setActiveTab('statistics');
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
        console.error('Global search error:', error);
        this.globalSearchLoading = false;
        
        // Show a message even on error
        this.globalSearchResult = { count: 0, keyword: this.globalSearchKeyword.trim() };
        
        // Auto-hide error after 3 seconds
        setTimeout(() => {
          this.globalSearchResult = null;
        }, 3000);
      }
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
}