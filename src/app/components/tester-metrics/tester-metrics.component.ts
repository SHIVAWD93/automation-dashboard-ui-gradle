import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ApiService } from "../../services/api.service";
import { AppService } from "../../services/app.service";
import { Tester } from "../../models/tester.model";
import { TestCase } from "../../models/test-case.model";
import { Project } from "../../models/project.model";
import { JenkinsResult } from "../../models/jenkins.model";
import { Chart, registerables } from "chart.js";
import {
  NgFor,
  NgIf,
  DatePipe,
  SlicePipe,
  TitleCasePipe,
  CommonModule,
} from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { CardModule } from "primeng/card";
import { Feedback } from "../../models/feedback";
import { Button } from "primeng/button";
import { Severity } from "../../models/utils";

Chart.register(...registerables);

interface TesterMetrics {
  totalTestCases: number;
  automatedTestCases: number;
  manualTestCases: number;
  inProgressTestCases: number;
  completedTestCases: number;
  automationCoverage: number;
}

interface TestCaseWithProject extends TestCase {
  projectName?: string;
  assignedDate?: Date;
  completedDate?: Date;
}

interface JenkinsJobAssignment {
  id: number;
  jobName: string;
  lastBuildStatus: string;
  lastExecutionDate: Date;
  jenkinsUrl?: string;
  passPercentage: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  project?: Project;
}

@Component({
  selector: "app-tester-metrics",
  templateUrl: "./tester-metrics.component.html",
  styleUrls: ["./tester-metrics.component.css"],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    DatePipe,
    SlicePipe,
    TitleCasePipe,
    CommonModule,
    CardModule,
    Button,
  ],
})
export class TesterMetricsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Core data
  testerId: number = 0;
  tester: Tester | null = null;
  testerMetrics: TesterMetrics = {
    totalTestCases: 0,
    automatedTestCases: 0,
    manualTestCases: 0,
    inProgressTestCases: 0,
    completedTestCases: 0,
    automationCoverage: 0,
  };

  // Test case assignments
  testCaseAssignments: TestCaseWithProject[] = [];
  filteredTestCases: TestCaseWithProject[] = [];

  // Jenkins job assignments
  jenkinsJobAssignments: JenkinsJobAssignment[] = [];

  // Reference data
  projects: Project[] = [];
  allTestCases: TestCase[] = [];
  allJenkinsResults: JenkinsResult[] = [];

  // Feedback
  feedbackForm: FormGroup;
  feedbackHistory: Feedback[] = [];
  showFeedbackHistory = false;

  // UI state
  loading = false;
  activeTab = "overview";

  // Filters
  dateRangeFilter = {
    startDate: "",
    endDate: "",
  };
  projectFilter = "";
  statusFilter = "";
  uniqueProjects: string[] = [];
  uniqueStatuses: string[] = [];

  // Charts
  progressChart: Chart | null = null;
  trendChart: Chart | null = null;

  // Sorting
  currentSort = { column: "", direction: "asc" as "asc" | "desc" };

  // Permissions
  canProvideFeedback = false;
  canAssignTasks = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private appService: AppService,
    private fb: FormBuilder,
  ) {
    this.feedbackForm = this.fb.group({
      feedback: ["", [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.canAssignTasks =
      this.appService.hasWritePermission || this.appService.hasAdminPermission;
    this.canProvideFeedback = this.appService.hasAdminPermission;

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.testerId = +params["id"];
      if (this.testerId) {
        this.loadTesterData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  async loadTesterData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadTesterProfile(),
        this.loadProjects(),
        this.loadAllTestCases(),
        this.loadJenkinsResults(),
      ]);

      this.processTestCaseAssignments();
      this.processJenkinsAssignments();
      this.calculateMetrics();
      this.processFilters();

      // Delay chart creation to ensure DOM is ready
      setTimeout(() => {
        this.createCharts();
      }, 100);
    } catch (error) {
      console.error("Error loading tester data:", error);
    } finally {
      this.loading = false;
    }
  }

  loadTesterProfile(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getTesterById(this.testerId).subscribe({
        next: (tester: Tester) => {
          this.tester = tester;
          resolve();
        },
        error: (error) => {
          console.error("Error loading tester profile:", error);
          // Create a default tester object to prevent null errors
          this.tester = {
            id: this.testerId,
            name: "Unknown Tester",
            role: "",
            gender: "",
            createdAt: new Date(),
          } as Tester;
          resolve(); // Don't fail the whole process
        },
      });
    });
  }

  loadProjects(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.getProjects().subscribe({
        next: (projects: Project[]) => {
          this.projects = projects;
          resolve();
        },
        error: (error) => {
          console.error("Error loading projects:", error);
          this.projects = [];
          resolve();
        },
      });
    });
  }

  loadAllTestCases(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.getTestCases().subscribe({
        next: (testCases: TestCase[]) => {
          this.allTestCases = testCases || [];
          resolve();
        },
        error: (error) => {
          console.error("Error loading test cases:", error);
          this.allTestCases = [];
          resolve();
        },
      });
    });
  }

  loadJenkinsResults(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.getJenkinsResults().subscribe({
        next: (results: JenkinsResult[]) => {
          this.allJenkinsResults = results || [];
          resolve();
        },
        error: (error) => {
          console.error("Error loading Jenkins results:", error);
          this.allJenkinsResults = [];
          resolve();
        },
      });
    });
  }

  processTestCaseAssignments(): void {
    const testerAssignments = this.allTestCases.filter(
      (tc) =>
        tc.testerId === this.testerId || tc.manualTesterId === this.testerId,
    );

    this.testCaseAssignments = testerAssignments.map((tc) => {
      const project = this.projects.find((p) => p.id === tc.projectId);

      return {
        ...tc,
        projectName: project?.name || "Unknown Project",
        assignedDate: tc.createdAt ? new Date(tc.createdAt) : new Date(),
        completedDate:
          tc.status === "Completed" || tc.status === "Automated"
            ? tc.updatedAt
              ? new Date(tc.updatedAt)
              : new Date()
            : undefined,
      };
    });

    this.filteredTestCases = [...this.testCaseAssignments];
  }

  processJenkinsAssignments(): void {
    const testerJenkinsJobs = this.allJenkinsResults.filter((jr) => {
      const automationTesterId = this.getTesterIdFromProperty(
        jr.automationTester,
      );
      const manualTesterId = this.getTesterIdFromProperty(jr.manualTester);

      return (
        automationTesterId === this.testerId || manualTesterId === this.testerId
      );
    });

    this.jenkinsJobAssignments = testerJenkinsJobs.map((jr) => {
      const project = this.getProjectFromProperty(jr.project);

      return {
        id: jr.id,
        jobName: jr.jobName || "Unknown Job",
        lastBuildStatus: jr.buildStatus || "Unknown",
        lastExecutionDate: jr.buildTimestamp
          ? new Date(jr.buildTimestamp)
          : new Date(),
        jenkinsUrl: jr.buildUrl || "",
        passPercentage: jr.passPercentage || 0,
        totalTests: jr.totalTests || 0,
        passedTests: jr.passedTests || 0,
        failedTests: jr.failedTests || 0,
        project,
      };
    });
  }

  private getTesterIdFromProperty(
    tester: Tester | number | undefined,
  ): number | null {
    if (!tester) {
      return null;
    }
    if (typeof tester === "number") {
      return tester;
    }

    return tester.id;
  }

  private getProjectFromProperty(
    project: Project | number | undefined,
  ): Project | undefined {
    if (!project) {
      return undefined;
    }
    if (typeof project === "number") {
      return this.projects.find((p) => p.id === project);
    }

    return project;
  }

  calculateMetrics(): void {
    const totalTestCases = this.testCaseAssignments.length;
    const automatedTestCases = this.testCaseAssignments.filter(
      (tc) =>
        (tc.status === "Automated" || tc.status === "Completed") &&
        tc.testerId === this.testerId,
    ).length;
    const inProgressTestCases = this.testCaseAssignments.filter(
      (tc) => tc.status === "In Progress",
    ).length;
    const manualTestCases = this.testCaseAssignments.filter(
      (tc) =>
        tc.status === "Ready to Automate" ||
        tc.manualTesterId === this.testerId,
    ).length;

    this.testerMetrics = {
      totalTestCases,
      automatedTestCases,
      manualTestCases,
      inProgressTestCases,
      completedTestCases: automatedTestCases,
      automationCoverage:
        totalTestCases > 0
          ? Math.round((automatedTestCases / totalTestCases) * 100)
          : 0,
    };
  }

  processFilters(): void {
    this.uniqueProjects = [
      ...new Set(this.testCaseAssignments.map((tc) => tc.projectName || "")),
    ];
    this.uniqueStatuses = [
      ...new Set(this.testCaseAssignments.map((tc) => tc.status)),
    ];
  }

  applyFilters(): void {
    let filtered = [...this.testCaseAssignments];

    if (this.dateRangeFilter.startDate) {
      const startDate = new Date(this.dateRangeFilter.startDate);
      filtered = filtered.filter(
        (tc) => tc.assignedDate && new Date(tc.assignedDate) >= startDate,
      );
    }

    if (this.dateRangeFilter.endDate) {
      const endDate = new Date(this.dateRangeFilter.endDate);
      filtered = filtered.filter(
        (tc) => tc.assignedDate && new Date(tc.assignedDate) <= endDate,
      );
    }

    if (this.projectFilter) {
      filtered = filtered.filter((tc) => tc.projectName === this.projectFilter);
    }

    if (this.statusFilter) {
      filtered = filtered.filter((tc) => tc.status === this.statusFilter);
    }

    this.filteredTestCases = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.dateRangeFilter = { startDate: "", endDate: "" };
    this.projectFilter = "";
    this.statusFilter = "";
    this.applyFilters();
  }

  // TrackBy functions for performance
  trackByTestCase(index: number, testCase: TestCaseWithProject): number {
    return testCase.id;
  }

  trackByJenkinsJob(index: number, job: JenkinsJobAssignment): number {
    return job.id;
  }
  // Sorting functionality
  sortTable(column: string): void {
    if (this.currentSort.column === column) {
      this.currentSort.direction =
        this.currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = "asc";
    }

    this.filteredTestCases.sort((a, b) => {
      let aVal: any = (a as any)[column];
      let bVal: any = (b as any)[column];

      if (column === "assignedDate" || column === "completedDate") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (this.currentSort.direction === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) {
      return "fas fa-sort";
    }

    return this.currentSort.direction === "asc"
      ? "fas fa-sort-up"
      : "fas fa-sort-down";
  }

  isSorted(column: string): boolean {
    return this.currentSort.column === column;
  }

  // Chart creation with better error handling
  createCharts(): void {
    try {
      this.createProgressChart();
      this.createTrendChart();
    } catch (error) {
      console.error("Error creating charts:", error);
    }
  }

  createProgressChart(): void {
    const ctx = document.getElementById("progressChart") as HTMLCanvasElement;
    if (!ctx) {
      console.warn("Progress chart canvas not found");

      return;
    }

    if (this.progressChart) {
      this.progressChart.destroy();
    }

    // Ensure we have data before creating chart
    if (this.testerMetrics.totalTestCases === 0) {
      this.createEmptyChart(ctx, "No test case data available");

      return;
    }

    this.progressChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Automated", "Manual", "In Progress"],
        datasets: [
          {
            data: [
              this.testerMetrics.automatedTestCases,
              this.testerMetrics.manualTestCases,
              this.testerMetrics.inProgressTestCases,
            ],
            backgroundColor: ["#28a745", "#17a2b8", "#ffc107"],
            borderColor: ["#1e7e34", "#138496", "#e0a800"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = this.testerMetrics.totalTestCases;
                const percentage =
                  total > 0
                    ? (((context.raw as number) / total) * 100).toFixed(1)
                    : "0";

                return `${context.label}: ${context.raw} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  createTrendChart(): void {
    const ctx = document.getElementById("trendChart") as HTMLCanvasElement;
    if (!ctx) {
      console.warn("Trend chart canvas not found");

      return;
    }

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const trendData = this.generateTrendData();

    if (trendData.data.every((val) => val === 0)) {
      this.createEmptyChart(ctx, "No trend data available");

      return;
    }

    this.trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: "Test Cases Automated",
            data: trendData.data,
            borderColor: "#28a745",
            backgroundColor: "rgba(40, 167, 69, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback(value) {
                return Number.isInteger(value) ? value : "";
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        elements: {
          point: {
            radius: 4,
            hoverRadius: 6,
          },
        },
      },
    });
  }

  private createEmptyChart(ctx: HTMLCanvasElement, message: string): void {
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [message],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e9ecef"],
            borderColor: ["#dee2e6"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });
  }

  generateTrendData(): { labels: string[]; data: number[] } {
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      labels.push(
        date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      );

      const monthCount = this.testCaseAssignments.filter((tc) => {
        if (
          !tc.completedDate ||
          (tc.status !== "Automated" && tc.status !== "Completed")
        ) {
          return false;
        }
        const completedDate = new Date(tc.completedDate);

        return (
          completedDate.getMonth() === date.getMonth() &&
          completedDate.getFullYear() === date.getFullYear()
        );
      }).length;

      data.push(monthCount);
    }

    return { labels, data };
  }

  destroyCharts(): void {
    if (this.progressChart) {
      this.progressChart.destroy();
      this.progressChart = null;
    }
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }
  }

  // Feedback functionality
  submitFeedback(): void {
    if (this.feedbackForm.valid || this.canProvideFeedback) {
      this.apiService
        .createFeedback({
          feedback: this.feedbackForm.get("feedback")?.value,
          testerId: this.testerId,
        })
        .subscribe({
          next: (data) => {
            this.feedbackForm.reset();
            this.getFeedback();
          },
        });
    }
  }

  deleteFeedback(id: number): void {
    this.apiService.deleteFeedback(id).subscribe({
      next: () => {
        this.feedbackHistory = this.feedbackHistory.filter(
          (fb) => fb.feedbackId !== id,
        );
        this.appService.showToast({
          severity: Severity.success,
          summary: "Success",
          detail: "Feedback deleted successfully.",
        });
      },
      error: (err) => {
        console.error("Failed to delete feedback:", err);
        this.appService.showToast({
          severity: Severity.error,
          summary: "Error",
          detail: "Error deleting feedback.",
        });
      },
    });
  }

  toggleFeedbackHistory(): void {
    this.showFeedbackHistory = !this.showFeedbackHistory;
    if (this.showFeedbackHistory) {
      this.getFeedback();
    }
  }

  getFeedback() {
    this.apiService.getAllFeedback(this.testerId).subscribe({
      next: (data) => {
        this.feedbackHistory = data;
      },
    });
  }

  // Utility methods
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Recreate charts when overview tab is selected
    if (tab === "overview") {
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case "Manual Tester":
        return "badge bg-primary";
      case "Automation Tester":
        return "badge bg-success";
      case "Manager":
        return "badge bg-info";
      default:
        return "badge bg-secondary";
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "Automated":
        return "bg-success";
      case "Completed":
        return "bg-primary";
      case "In Progress":
        return "bg-warning text-dark";
      case "Ready to Automate":
        return "bg-info";
      case "Failed":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case "High":
        return "bg-danger";
      case "Medium":
        return "bg-warning text-dark";
      case "Low":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  }

  getBuildStatusColor(status: string): string {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return "bg-success";
      case "FAILURE":
        return "bg-danger";
      case "UNSTABLE":
        return "bg-warning text-dark";
      case "ABORTED":
        return "bg-secondary";
      default:
        return "bg-info";
    }
  }

  getFeedbackTypeColor(type: string): string {
    switch (type) {
      case "positive":
        return "bg-success";
      case "improvement":
        return "bg-warning text-dark";
      case "general":
      default:
        return "bg-info";
    }
  }

  openJenkinsJob(jenkinsUrl: string): void {
    if (jenkinsUrl) {
      window.open(jenkinsUrl, "_blank");
    }
  }

  exportToPDF(): void {
    const reportData = {
      tester: this.tester,
      metrics: this.testerMetrics,
      testCases: this.filteredTestCases,
      jenkinsJobs: this.jenkinsJobAssignments,
      feedback: this.feedbackHistory,
    };

    this.apiService
      .generateReport("tester-metrics", {
        testerId: this.testerId,
        data: reportData,
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${this.tester?.name || "Tester"}_Metrics_Report.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error("Error generating PDF report:", error);
          alert("PDF export functionality not yet implemented on the backend.");
        },
      });
  }

  assignTestCase(): void {
    if (!this.canAssignTasks) {
      return;
    }
    this.router.navigate(["/test-cases"], {
      queryParams: { assignTo: this.testerId },
    });
  }

  assignJenkinsJob(): void {
    if (!this.canAssignTasks) {
      return;
    }
    this.router.navigate(["/jenkins-results"], {
      queryParams: { assignTo: this.testerId },
    });
  }
}
