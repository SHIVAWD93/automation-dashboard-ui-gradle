import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Project, Domain } from '../../models/project.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DashboardStats {
  totalDomains: number;
  totalProjects: number;
  totalTestCases: number;
  totalTesters: number;
  automatedTestCases: number;
  inProgressTestCases: number;
  readyTestCases: number;
  completedTestCases: number;
}

interface ProjectTestCaseStats {
  total: number;
  automated: number;
  inProgress: number;
  ready: number;
  completed: number;
}

interface DomainStats {
  totalProjects: number;
  totalTestCases: number;
  automatedTestCases: number;
  inProgressTestCases: number;
  readyTestCases: number;
  completedTestCases: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  dashboardStats: DashboardStats = {
    totalDomains: 0,
    totalProjects: 0,
    totalTestCases: 0,
    totalTesters: 0,
    automatedTestCases: 0,
    inProgressTestCases: 0,
    readyTestCases: 0,
    completedTestCases: 0
  };

  domains: Domain[] = [];
  projects: Project[] = [];
  filteredProjects: Project[] = [];

  selectedDomainId: string = '';
  selectedProjectId: string = '';
  selectedDomain: Domain | null = null;
  selectedProject: Project | null = null;

  projectTestCaseStats: ProjectTestCaseStats = {
    total: 0,
    automated: 0,
    inProgress: 0,
    ready: 0,
    completed: 0
  };

  domainStats: DomainStats = {
    totalProjects: 0,
    totalTestCases: 0,
    automatedTestCases: 0,
    inProgressTestCases: 0,
    readyTestCases: 0,
    completedTestCases: 0
  };

  coverageChart: Chart | null = null;
  statusChart: Chart | null = null;

  constructor(private apiService: ApiService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      await Promise.all([
        this.loadDomains(),
        this.loadProjects(),
        this.loadDashboardStats()
      ]);

      this.createCoverageChart();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  loadDomains(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getActiveDomains().subscribe(
        (data: Domain[]) => {
          this.domains = data;
          resolve();
        },
        (error) => {
          console.error('Error loading domains:', error);
          reject(error);
        }
      );
    });
  }

  loadProjects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiService.getProjects().subscribe(
        (data: Project[]) => {
          this.projects = data;
          resolve();
        },
        (error) => {
          console.error('Error loading projects:', error);
          reject(error);
        }
      );
    });
  }

  loadDashboardStats(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load dashboard statistics
      this.apiService.getDashboardStats().subscribe(
        (stats: DashboardStats) => {
          this.dashboardStats = stats;
          resolve();
        },
        (error) => {
          console.error('Error loading dashboard stats:', error);
          // Fallback: calculate basic stats from available data
          this.calculateBasicStats();
          resolve();
        }
      );
    });
  }

  calculateBasicStats(): void {
    this.dashboardStats.totalDomains = this.domains.length;
    this.dashboardStats.totalProjects = this.projects.length;
    // Other stats would need to be calculated from test cases data
  }

  onDomainChange(): void {
    if (this.selectedDomainId) {
      this.selectedDomain = this.domains.find(d => d.id.toString() === this.selectedDomainId) || null;
      this.filteredProjects = this.projects.filter(p => p.domain && p.domain.id.toString() === this.selectedDomainId);
      this.selectedProjectId = ''; // Reset project selection
      this.selectedProject = null;

      this.loadDomainStats();
      this.updateStatusChart();
    } else {
      this.selectedDomain = null;
      this.filteredProjects = [];
      this.selectedProjectId = '';
      this.selectedProject = null;
      this.clearStatusChart();
    }
  }

  onProjectChange(): void {
    if (this.selectedProjectId) {
      this.selectedProject = this.filteredProjects.find(p => p.id.toString() === this.selectedProjectId) || null;
      this.loadProjectTestCaseStats();
    } else {
      this.selectedProject = null;
      this.loadDomainStats();
    }
    this.updateStatusChart();
  }

  loadDomainStats(): void {
    if (!this.selectedDomainId) return;

    const domainId = parseInt(this.selectedDomainId);

    // Get projects count for domain
    this.domainStats.totalProjects = this.filteredProjects.length;

    // Load test case stats for all projects in domain
    this.apiService.getTestCasesByDomain(domainId).subscribe(
      (testCases: any[]) => {
        this.domainStats.totalTestCases = testCases.length;
        this.domainStats.automatedTestCases = testCases.filter(tc => tc.status === 'Automated').length;
        this.domainStats.inProgressTestCases = testCases.filter(tc => tc.status === 'In Progress').length;
        this.domainStats.readyTestCases = testCases.filter(tc => tc.status === 'Ready to Automate').length;
        this.domainStats.completedTestCases = testCases.filter(tc => tc.status === 'Completed').length;
        this.updateStatusChart();
      },
      (error) => {
        console.error('Error loading domain test case stats:', error);
      }
    );
  }

  loadProjectTestCaseStats(): void {
    if (!this.selectedProjectId) return;

    const projectId = parseInt(this.selectedProjectId);

    this.apiService.getTestCasesByProject(projectId).subscribe(
      (testCases: any[]) => {
        this.projectTestCaseStats.total = testCases.length;
        this.projectTestCaseStats.automated = testCases.filter(tc => tc.status === 'Automated').length;
        this.projectTestCaseStats.inProgress = testCases.filter(tc => tc.status === 'In Progress').length;
        this.projectTestCaseStats.ready = testCases.filter(tc => tc.status === 'Ready to Automate').length;
        this.projectTestCaseStats.completed = testCases.filter(tc => tc.status === 'Completed').length;
        this.updateStatusChart();
      },
      (error) => {
        console.error('Error loading project test case stats:', error);
      }
    );
  }

  createCoverageChart(): void {
    const ctx = document.getElementById('coverageChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.coverageChart) {
      this.coverageChart.destroy();
    }

    const total = this.dashboardStats.totalTestCases;
    const automated = this.dashboardStats.automatedTestCases+this.dashboardStats.completedTestCases;
    const notAutomated = total - automated;

    this.coverageChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Automated', 'Not Automated'],
        datasets: [{
          data: [automated, notAutomated],
          backgroundColor: ['#28a745', '#dc3545'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = total > 0 ? ((context.raw as number / total) * 100).toFixed(1) : '0';
                return `${context.label}: ${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
            this.cd.markForCheck();
  }

  updateStatusChart(): void {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.statusChart) {
      this.statusChart.destroy();
    }

    let data: number[] = [];
    let title = '';

    if (this.selectedProjectId && this.selectedProject) {
      // Project-specific data
      data = [
        this.projectTestCaseStats.ready,
        this.projectTestCaseStats.inProgress,
        this.projectTestCaseStats.automated,
        this.projectTestCaseStats.completed
      ];
      title = `${this.selectedProject.name} Test Cases`;
    } else if (this.selectedDomainId && this.selectedDomain) {
      // Domain-wide data
      data = [
        this.domainStats.readyTestCases,
        this.domainStats.inProgressTestCases,
        this.domainStats.automatedTestCases,
        this.domainStats.completedTestCases
      ];
      title = `${this.selectedDomain.name} Domain Test Cases`;
    } else {
      this.clearStatusChart();
      return;
    }

    this.statusChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ready to Automate', 'In Progress', 'Automated', 'failed'],
        datasets: [{
          label: 'Test Cases',
          data: data,
          backgroundColor: ['#17a2b8', '#ffc107', '#28a745', '#dc3545'],
          borderColor: ['#138496', '#e0a800', '#1e7e34', '#5a32a3'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: title
          }
        }
      }
    });
            this.cd.markForCheck();

  }

  clearStatusChart(): void {
    if (this.statusChart) {
      this.statusChart.destroy();
      this.statusChart = null;
    }
  }

  getSelectedDisplayText(): string {
    if (this.selectedProjectId && this.selectedProject) {
      return `Project Details: ${this.selectedProject.name}`;
    } else if (this.selectedDomainId && this.selectedDomain) {
      return `Domain Details: ${this.selectedDomain.name}`;
    }
    return 'Selection Details';
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return 'bg-secondary';

    switch (status) {
      case 'Active':
        return 'bg-success';
      case 'Inactive':
        return 'bg-danger';
      case 'Completed':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  ngOnDestroy(): void {
    if (this.coverageChart) {
      this.coverageChart.destroy();
    }
    if (this.statusChart) {
      this.statusChart.destroy();
    }
  }
}