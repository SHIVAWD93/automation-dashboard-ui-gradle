import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { JenkinsResult, JenkinsTestCase, JenkinsStatistics, JenkinsFilters } from '../../models/jenkins.model';
import { Chart, registerables } from 'chart.js';
import { Tester } from '../../models/tester.model';
import { Project } from '../../models/project.model';

Chart.register(...registerables);

@Component({
  selector: 'app-jenkins-results',
  templateUrl: './jenkins-results.component.html',
  styleUrls: ['./jenkins-results.component.css']
})
export class JenkinsResultsComponent implements OnInit, OnDestroy {
  jenkinsResults: JenkinsResult[] = [];
  selectedJob: JenkinsResult | null = null;
  selectedJobTestCases: JenkinsTestCase[] = [];
  filteredTestCases: JenkinsTestCase[] = [];

  jenkinsStats: JenkinsStatistics = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0
  };

  loading = false;
  syncing = false;
  generating = false;
  connectionStatus = false;
  searchTerm = '';
  filteredResults: JenkinsResult[] = [];
  selectedStatus = '';
  showReport = false;
  testngReport: any = null;

  // Test case filtering
  testCaseSearchTerm = '';
  selectedTestCaseStatus = '';

  // Chart instances
  overallChart: Chart | null = null;
  jobChart: Chart | null = null;

  // Sorting
  currentSort = { column: '', direction: 'asc' };
  currentTestCaseSort = { column: '', direction: 'asc' };

  // Status filter options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'FAILURE', label: 'Failure' },
    { value: 'UNSTABLE', label: 'Unstable' },
    { value: 'ABORTED', label: 'Aborted' }
  ];

  // Test case status filter options
  testCaseStatusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PASSED', label: 'Passed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'SKIPPED', label: 'Skipped' }
  ];

  // NEW: Enhanced filtering properties
  testers: Tester[] = [];
  projects: Project[] = [];
  jobFrequencies: string[] = [];
  automationTesters: Tester[] = [];

  // Filter state
  selectedProjectId: number | null = null;
  selectedAutomationTesterId: number | null = null;
  selectedJobFrequency = '';
  passPercentageThreshold: number = 0;
  passPercentageOperator: 'gte' | 'lte' = 'gte'; // 'gte' for greater than or equal, 'lte' for less than or equal

  // Selection state for testers and projects
  automationTesterSelection: { [key: number]: number | null } = {};
  manualTesterSelection: { [key: number]: number | null } = {};
  projectSelection: { [key: number]: number | null } = {};
  jobNotes: string = '';

  // UI state management for save functionality
  isSaving = false;
  saveButtonDisabled = true;
  originalNotes = '';
  originalAutomationTester: number | null = null;
  originalManualTester: number | null = null;
  originalProject: number | null = null;
  showSuccessMessage = false;
  successMessage = '';

  // Stack trace modal state
  showStackTraceModal = false;
  selectedStackTrace: string = '';
  selectedTestCaseName: string = '';

  // NEW: Job frequency options
  jobFrequencyOptions = [
    { value: '', label: 'All Frequencies' },
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'On Demand', label: 'On Demand' },
    { value: 'Continuous', label: 'Continuous' },
    { value: 'Unknown', label: 'Unknown' }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadJenkinsData();
    this.testConnection();
    this.loadTesters();
    this.loadProjects();
    this.loadJobFrequencies();
    this.loadAutomationTesters();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  async loadJenkinsData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadJenkinsResults(),
        this.loadJenkinsStatistics()
      ]);
      this.createOverallChart();
    } catch (error) {
      console.error('Error loading Jenkins data:', error);
    } finally {
      this.loading = false;
    }
  }

  loadJenkinsResults(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use filtered results if filters are applied
      const hasFilters = this.selectedProjectId || this.selectedAutomationTesterId || this.selectedJobFrequency || this.selectedStatus;

      if (hasFilters) {
        this.apiService.getFilteredJenkinsResults({
          projectId: this.selectedProjectId || undefined,
          automationTesterId: this.selectedAutomationTesterId || undefined,
          jobFrequency: this.selectedJobFrequency || undefined,
          buildStatus: this.selectedStatus || undefined
        }).subscribe(
          (data: JenkinsResult[]) => {
            this.jenkinsResults = data || [];
            this.applyFilters();
            resolve();
          },
          (error) => {
            console.error('Error loading filtered Jenkins results:', error);
            this.jenkinsResults = [];
            this.applyFilters();
            reject(error);
          }
        );
      } else {
        this.apiService.getJenkinsResults().subscribe(
          (data: JenkinsResult[]) => {
            this.jenkinsResults = data || [];
            this.applyFilters();
            resolve();
          },
          (error) => {
            console.error('Error loading Jenkins results:', error);
            this.jenkinsResults = [];
            this.applyFilters();
            reject(error);
          }
        );
      }
    });
  }

  loadJenkinsStatistics(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getJenkinsStatistics().subscribe(
        (data: JenkinsStatistics) => {
          this.jenkinsStats = data;
          resolve();
        },
        (error) => {
          console.error('Error loading Jenkins statistics:', error);
          reject(error);
        }
      );
    });
  }

  // NEW: Load filter data
  loadProjects(): void {
    this.apiService.getProjects().subscribe(
      (data: Project[]) => {
        this.projects = data || [];
      },
      (error) => console.error('Error loading projects with Jenkins results:', error)
    );
  }

  loadJobFrequencies(): void {
    this.apiService.getJobFrequencies().subscribe(
      (data: string[]) => {
        this.jobFrequencies = data || [];
      },
      (error) => console.error('Error loading job frequencies:', error)
    );
  }

  loadAutomationTesters(): void {
    this.apiService.getAutomationTestersWithJenkinsResults().subscribe(
      (data: Tester[]) => {
        this.automationTesters = data || [];
      },
      (error) => console.error('Error loading automation testers:', error)
    );
  }

  testConnection(): void {
    this.apiService.testJenkinsConnection().subscribe(
      (response) => {
        this.connectionStatus = response.connected;
      },
      (error) => {
        console.error('Error testing Jenkins connection:', error);
        this.connectionStatus = false;
      }
    );
  }

  syncAllJobs(): void {
    this.syncing = true;
    this.apiService.syncJenkinsJobs().subscribe(
      (response) => {
        console.log('Sync successful:', response.message);
        this.loadJenkinsData();
        this.syncing = false;
      },
      (error) => {
        console.error('Sync failed:', error);
        this.syncing = false;
      }
    );
  }

  generateTestNGReport(): void {
    this.generating = true;
    this.apiService.syncAndGenerateJenkinsReport().subscribe(
      (response) => {
        console.log('Report generated successfully:', response.message);
        this.testngReport = response.report;
        this.showReport = true;
        this.loadJenkinsData();
        this.generating = false;
      },
      (error) => {
        console.error('Report generation failed:', error);
        this.generating = false;
      }
    );
  }

  closeReport(): void {
    this.showReport = false;
    this.testngReport = null;
  }

  syncSingleJob(jobName: string): void {
    this.apiService.syncSingleJenkinsJob(jobName).subscribe(
      (response) => {
        console.log('Job sync successful:', response.message);
        this.loadJenkinsData();
      },
      (error) => {
        console.error('Job sync failed:', error);
      }
    );
  }

  loadTesters(): void {
    this.apiService.getTesters().subscribe(
      (data: Tester[]) => this.testers = data,
      (error) => console.error('Error loading testers:', error)
    );
  }

  getPassPercentage(result: JenkinsResult): number {
    if (!result || !result.totalTests) {
      return 0;
    }
    return Math.round((result.passedTests / result.totalTests) * 100);
  }

  // Helper method to safely get tester ID
  private getTesterIdSafely(tester: Tester | number | null | undefined): number | null {
    if (!tester) {
      return null;
    }
    if (typeof tester === 'number') {
      return tester;
    }
    return tester.id;
  }

  // Helper method to safely get project ID
  private getProjectIdSafely(project: Project | number | null | undefined): number | null {
    if (!project) {
      return null;
    }
    if (typeof project === 'number') {
      return project;
    }
    return project.id;
  }

  selectJob(job: JenkinsResult): void {
    this.selectedJob = job;
    this.jobNotes = (job.bugsIdentified || '') as string;
    this.originalNotes = this.jobNotes;

    // Set original values for change detection
    this.originalAutomationTester = this.getTesterIdSafely(job.automationTester);
    this.originalManualTester = this.getTesterIdSafely(job.manualTester);
    this.originalProject = this.getProjectIdSafely(job.project);

    // Set current selections
    this.automationTesterSelection[job.id] = this.originalAutomationTester;
    this.manualTesterSelection[job.id] = this.originalManualTester;
    this.projectSelection[job.id] = this.originalProject;

    this.checkSaveButtonState();
    this.loadJobTestCases(job.id);
  }

  // Check if save button should be enabled
  checkSaveButtonState(): void {
    if (!this.selectedJob) {
      this.saveButtonDisabled = true;
      return;
    }

    const notesChanged = this.jobNotes !== this.originalNotes;
    const automationTesterChanged = this.automationTesterSelection[this.selectedJob.id] !== this.originalAutomationTester;
    const manualTesterChanged = this.manualTesterSelection[this.selectedJob.id] !== this.originalManualTester;
    const projectChanged = this.projectSelection[this.selectedJob.id] !== this.originalProject;

    const hasNotes = this.jobNotes && this.jobNotes.trim().length > 0;
    const hasAutomationTester = this.automationTesterSelection[this.selectedJob.id] !== null;
    const hasManualTester = this.manualTesterSelection[this.selectedJob.id] !== null;
    const hasProject = this.projectSelection[this.selectedJob.id] !== null;

    // Enable save button if something has changed AND at least one field has a value
    this.saveButtonDisabled = !(
      (notesChanged || automationTesterChanged || manualTesterChanged || projectChanged) &&
      (hasNotes || hasAutomationTester || hasManualTester || hasProject)
    );
  }

  // Combined save functionality
  saveAllData(): void {
    if (!this.selectedJob || this.isSaving) {
      return;
    }

    this.isSaving = true;

    const requestData = {
      notes: this.jobNotes,
      automationTesterId: this.automationTesterSelection[this.selectedJob.id],
      manualTesterId: this.manualTesterSelection[this.selectedJob.id],
      projectId: this.projectSelection[this.selectedJob.id]
    };

    this.apiService.saveJenkinsJobData(this.selectedJob.id, requestData).subscribe(
      (response) => {
        console.log('Data saved successfully:', response);

        // Update the selected job with the new data
        if (this.selectedJob) {
          this.selectedJob.bugsIdentified = this.jobNotes;

          if (requestData.automationTesterId) {
            const tester = this.testers.find(t => t.id === requestData.automationTesterId);
            if (tester) {
              this.selectedJob.automationTester = tester;
            }
          }

          if (requestData.manualTesterId) {
            const tester = this.testers.find(t => t.id === requestData.manualTesterId);
            if (tester) {
              this.selectedJob.manualTester = tester;
            }
          }

          if (requestData.projectId) {
            const project = this.projects.find(p => p.id === requestData.projectId);
            if (project) {
              this.selectedJob.project = project;
            }
          }

          // Update pass percentage if provided in response
          if (response.passPercentage !== undefined) {
            this.selectedJob.passPercentage = response.passPercentage;
          }
        }

        // Update original values
        this.originalNotes = this.jobNotes;
        this.originalAutomationTester = requestData.automationTesterId;
        this.originalManualTester = requestData.manualTesterId;
        this.originalProject = requestData.projectId;

        // Show success message
        this.showSuccessToast('Data saved successfully!');

        // Update button state
        this.checkSaveButtonState();
        this.isSaving = false;
      },
      (error) => {
        console.error('Error saving data:', error);
        this.showSuccessToast('Failed to save data. Please try again.', true);
        this.isSaving = false;
      }
    );
  }

  // Show success/error toast message
  showSuccessToast(message: string, isError: boolean = false): void {
    this.successMessage = message;
    this.showSuccessMessage = true;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  // Event handlers for input changes
  onNotesChange(): void {
    this.checkSaveButtonState();
  }

  onTesterSelectionChange(): void {
    this.checkSaveButtonState();
  }

  onProjectSelectionChange(): void {
    this.checkSaveButtonState();
  }

  // NEW: Filter change handlers
  onFilterChange(): void {
    this.loadJenkinsResults();
  }

  onProjectFilterChange(): void {
    this.onFilterChange();
  }

  onAutomationTesterFilterChange(): void {
    this.onFilterChange();
  }

  onJobFrequencyFilterChange(): void {
    this.onFilterChange();
  }

  loadJobTestCases(resultId: number): void {
    this.apiService.getJenkinsTestCases(resultId).subscribe(
      (testCases: JenkinsTestCase[]) => {
        this.selectedJobTestCases = testCases || [];

        if (this.selectedJobTestCases.length === 0 && this.selectedJob) {
          this.loadDetailedTestNGResults(this.selectedJob.jobName, this.selectedJob.buildNumber);
        } else {
          this.applyTestCaseFilters();
          this.createJobChart();
        }
      },
      (error) => {
        console.error('Error loading test cases:', error);
        if (this.selectedJob) {
          this.loadDetailedTestNGResults(this.selectedJob.jobName, this.selectedJob.buildNumber);
        }
      }
    );
  }

  loadDetailedTestNGResults(jobName: string, buildNumber: string): void {
    this.apiService.getDetailedJenkinsTestCases(jobName, buildNumber).subscribe(
      (response: any) => {
        if (response.testCases) {
          this.selectedJobTestCases = response.testCases.map((tc: any) => ({
            id: 0,
            testName: tc.testName,
            className: tc.className,
            status: this.normalizeTestStatus(tc.status),
            duration: tc.duration || 0,
            errorMessage: tc.errorMessage,
            stackTrace: tc.stackTrace,
            createdAt: new Date()
          }));

          if (this.selectedJob) {
            this.selectedJob.passedTests = response.passedCount || 0;
            this.selectedJob.failedTests = response.failedCount || 0;
            this.selectedJob.skippedTests = response.skippedCount || 0;
            this.selectedJob.totalTests = response.totalCount || 0;
          }
        } else {
          this.selectedJobTestCases = [];
        }
        this.applyTestCaseFilters();
        this.createJobChart();
      },
      (error) => {
        console.error('Error loading detailed TestNG results:', error);
        this.selectedJobTestCases = [];
        this.applyTestCaseFilters();
        this.createJobChart();
      }
    );
  }

  normalizeTestStatus(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PASS':
      case 'PASSED':
        return 'PASSED';
      case 'FAIL':
      case 'FAILED':
        return 'FAILED';
      case 'SKIP':
      case 'SKIPPED':
        return 'SKIPPED';
      default:
        return status || 'UNKNOWN';
    }
  }

  // Get failure reason or placeholder text
  getFailureReason(testCase: JenkinsTestCase): string {
    if (testCase.status === 'FAILED') {
      if (testCase.errorMessage && testCase.errorMessage.trim()) {
        return testCase.errorMessage;
      }
      return 'Need to identify the failed reason';
    }
    return '';
  }



  // Check if test case has stack trace
  hasStackTrace(testCase: JenkinsTestCase): boolean {
    return !!(testCase.stackTrace && testCase.stackTrace.trim());
  }

  // Get truncated stack trace for display
  getTruncatedStackTrace(testCase: JenkinsTestCase): string {
    if (!testCase.stackTrace) return '';
    return testCase.stackTrace.length > 200
      ? testCase.stackTrace.substring(0, 200) + '...'
      : testCase.stackTrace;
  }

  // Show full stack trace in modal
  showFullStackTrace(testCase: JenkinsTestCase): void {
    this.selectedStackTrace = testCase.stackTrace || '';
    this.selectedTestCaseName = testCase.testName;
    this.showStackTraceModal = true;
  }

  // Close stack trace modal
  closeStackTraceModal(): void {
    this.showStackTraceModal = false;
    this.selectedStackTrace = '';
    this.selectedTestCaseName = '';
  }

  // Copy stack trace to clipboard
  copyStackTrace(): void {
    if (this.selectedStackTrace) {
      navigator.clipboard.writeText(this.selectedStackTrace).then(() => {
        this.showSuccessToast('Stack trace copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.selectedStackTrace;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          this.showSuccessToast('Stack trace copied to clipboard!');
        } catch (err) {
          this.showSuccessToast('Failed to copy stack trace. Please copy manually.', true);
        }
        document.body.removeChild(textArea);
      });
    }
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onTestCaseSearchChange(): void {
    this.applyTestCaseFilters();
  }

  onTestCaseStatusFilterChange(): void {
    this.applyTestCaseFilters();
  }

  applyFilters(): void {
    let filtered = this.jenkinsResults;

    if (this.selectedStatus) {
      filtered = filtered.filter(result => result.buildStatus === this.selectedStatus);
    }

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.jobName.toLowerCase().includes(searchLower)
      );
    }

    if (this.passPercentageThreshold) {
      if (this.passPercentageOperator === 'gte') {
        filtered = filtered.filter(r => this.getPassPercentage(r) >= this.passPercentageThreshold);
      } else {
        filtered = filtered.filter(r => this.getPassPercentage(r) <= this.passPercentageThreshold);
      }
    }

    this.filteredResults = filtered;
  }

  applyTestCaseFilters(): void {
    let filtered = this.selectedJobTestCases;

    if (this.selectedTestCaseStatus) {
      filtered = filtered.filter(testCase => testCase.status === this.selectedTestCaseStatus);
    }

    if (this.testCaseSearchTerm.trim()) {
      const searchLower = this.testCaseSearchTerm.toLowerCase();
      filtered = filtered.filter(testCase =>
        testCase.testName.toLowerCase().includes(searchLower) ||
        testCase.className.toLowerCase().includes(searchLower)
      );
    }

    this.filteredTestCases = filtered;
  }

  sortTable(column: string): void {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }

    this.filteredResults.sort((a, b) => {
      let aVal: any = a[column as keyof JenkinsResult];
      let bVal: any = b[column as keyof JenkinsResult];

      if (column === 'buildTimestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (this.currentSort.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  sortTestCases(column: string): void {
    if (this.currentTestCaseSort.column === column) {
      this.currentTestCaseSort.direction = this.currentTestCaseSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentTestCaseSort.column = column;
      this.currentTestCaseSort.direction = 'asc';
    }

    this.filteredTestCases.sort((a, b) => {
      let aVal: any = a[column as keyof JenkinsTestCase];
      let bVal: any = b[column as keyof JenkinsTestCase];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (this.currentTestCaseSort.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) {
      return 'fas fa-sort';
    }
    return this.currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  getTestCaseSortIcon(column: string): string {
    if (this.currentTestCaseSort.column !== column) {
      return 'fas fa-sort';
    }
    return this.currentTestCaseSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  isSorted(column: string): boolean {
    return this.currentSort.column === column;
  }

  isTestCaseSorted(column: string): boolean {
    return this.currentTestCaseSort.column === column;
  }

  createOverallChart(): void {
    const ctx = document.getElementById('overallChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.overallChart) {
      this.overallChart.destroy();
    }

    const chartData = this.jenkinsResults.map(result => ({
      jobName: result.jobName,
      passed: result.passedTests || 0,
      failed: result.failedTests || 0,
      skipped: result.skippedTests || 0
    }));

    this.overallChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(data => data.jobName),
        datasets: [
          {
            label: 'Passed',
            data: chartData.map(data => data.passed),
            backgroundColor: '#28a745',
            borderColor: '#1e7e34',
            borderWidth: 1
          },
          {
            label: 'Failed',
            data: chartData.map(data => data.failed),
            backgroundColor: '#dc3545',
            borderColor: '#c82333',
            borderWidth: 1
          },
          {
            label: 'Skipped',
            data: chartData.map(data => data.skipped),
            backgroundColor: '#ffc107',
            borderColor: '#e0a800',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'Test Results by Job'
          }
        }
      }
    });
  }

  createJobChart(): void {
    const ctx = document.getElementById('jobChart') as HTMLCanvasElement;
    if (!ctx || !this.selectedJob) return;

    if (this.jobChart) {
      this.jobChart.destroy();
    }

    const passed = this.selectedJob.passedTests || 0;
    const failed = this.selectedJob.failedTests || 0;
    const skipped = this.selectedJob.skippedTests || 0;

    this.jobChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [passed, failed, skipped],
          backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
          borderColor: ['#1e7e34', '#c82333', '#e0a800'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: `${this.selectedJob.jobName} - Build #${this.selectedJob.buildNumber}`
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = passed + failed + skipped;
                const percentage = total > 0 ? ((context.raw as number / total) * 100).toFixed(1) : '0';
                return `${context.label}: ${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  destroyCharts(): void {
    if (this.overallChart) {
      this.overallChart.destroy();
      this.overallChart = null;
    }
    if (this.jobChart) {
      this.jobChart.destroy();
      this.jobChart = null;
    }
  }

  getBuildStatusColor(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'bg-success';
      case 'FAILURE':
        return 'bg-danger';
      case 'UNSTABLE':
        return 'bg-warning';
      case 'ABORTED':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  }

  getTestStatusColor(status: string): string {
    switch (status.toUpperCase()) {
      case 'PASSED':
        return 'text-success';
      case 'FAILED':
        return 'text-danger';
      case 'SKIPPED':
        return 'text-warning';
      default:
        return 'text-secondary';
    }
  }

  getTestStatusIcon(status: string): string {
    switch (status.toUpperCase()) {
      case 'PASSED':
        return 'fas fa-check-circle';
      case 'FAILED':
        return 'fas fa-times-circle';
      case 'SKIPPED':
        return 'fas fa-minus-circle';
      default:
        return 'fas fa-question-circle';
    }
  }

  formatDuration(duration: number): string {
    if (duration < 1) {
      return `${(duration * 1000).toFixed(0)}ms`;
    } else {
      return `${duration.toFixed(2)}s`;
    }
  }

  getPassedTestCasesCount(): number {
    return this.filteredTestCases.filter(tc => tc.status === 'PASSED').length;
  }

  getFailedTestCasesCount(): number {
    return this.filteredTestCases.filter(tc => tc.status === 'FAILED').length;
  }

  getSkippedTestCasesCount(): number {
    return this.filteredTestCases.filter(tc => tc.status === 'SKIPPED').length;
  }

  clearSelection(): void {
    this.selectedJob = null;
    this.selectedJobTestCases = [];
    this.filteredTestCases = [];
    this.testCaseSearchTerm = '';
    this.selectedTestCaseStatus = '';
    this.jobNotes = '';
    this.originalNotes = '';
    this.automationTesterSelection = {};
    this.manualTesterSelection = {};
    this.projectSelection = {};
    this.saveButtonDisabled = true;
    this.destroyCharts();
    setTimeout(() => this.createOverallChart(), 100);
  }

  // Helper methods for display
  displayTester(tester: Tester | number | null | undefined): string {
    if (!tester) {
      return '';
    }
    if (typeof tester === 'number') {
      const found = this.testers.find(t => t.id === tester);
      return found ? found.name : tester.toString();
    }
    return tester.name;
  }

  displayProject(project: Project | number | null | undefined): string {
    if (!project) {
      return '';
    }
    if (typeof project === 'number') {
      const found = this.projects.find(p => p.id === project);
      return found ? found.name : project.toString();
    }
    return project.name;
  }

  // NEW: Get project name safely
  getProjectName(result: JenkinsResult): string {
    if (!result.project) {
      return 'No Project';
    }
    return typeof result.project === 'object' ? result.project.name : 'Unknown Project';
  }

  // NEW: Get job frequency display
  getJobFrequencyDisplay(result: JenkinsResult): string {
    return result.jobFrequency || 'Unknown';
  }

  // Legacy methods - keeping for backward compatibility
  assignTesters(result: JenkinsResult): void {
    const automationId = this.automationTesterSelection[result.id] ?? null;
    const manualId = this.manualTesterSelection[result.id] ?? null;
    if (automationId === null && manualId === null) {
      return;
    }
    this.apiService.assignTestersToJenkinsResult(result.id, automationId, manualId).subscribe(
      () => {
        if (automationId) {
          const tester = this.testers.find(t => t.id === automationId);
          if (tester) {
            result.automationTester = tester;
          }
        }
        if (manualId) {
          const tester = this.testers.find(t => t.id === manualId);
          if (tester) {
            result.manualTester = tester;
          }
        }
        this.automationTesterSelection[result.id] = null;
        this.manualTesterSelection[result.id] = null;
      },
      (error) => console.error('Error assigning testers:', error)
    );
  }

  saveJobNotes(): void {
    if (!this.selectedJob) { return; }
    const notes = { bugsIdentified: this.jobNotes, failureReasons: this.jobNotes };
    this.apiService.updateJenkinsJobNotes(this.selectedJob.id, notes).subscribe(
      () => {
        this.selectedJob!.bugsIdentified = this.jobNotes;
      },
      (error) => console.error('Error saving job notes:', error)
    );
  }
}