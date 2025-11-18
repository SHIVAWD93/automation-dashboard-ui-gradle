// Updated test-case-tracking.component.ts
import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { TestCase } from "../../models/test-case.model";
import { Project } from "../../models/project.model";
import { Tester } from "../../models/tester.model";
import { PrimeTemplate } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { BulkUploadComponent } from "../bulk-upload/bulk-upload.component";
import { NgFor, NgIf } from "@angular/common";
import { Button } from "primeng/button";
import { AppService } from "../../services/app.service";
import { DatePipe, SlicePipe, TitleCasePipe } from "@angular/common";

@Component({
  selector: "app-test-case-tracking",
  templateUrl: "./test-case-tracking.component.html",
  styleUrls: ["./test-case-tracking.component.scss"],
  standalone: true,
  imports: [
    Button,
    FormsModule,
    NgFor,
    NgIf,
    BulkUploadComponent,
    DialogModule,
    PrimeTemplate,
    ReactiveFormsModule,
    DatePipe,
    SlicePipe,
    TitleCasePipe,
  ],
})
export class TestCaseTrackingComponent implements OnInit {
  Math = Math; // For use in template

  testCaseForm: FormGroup;

  testCases: TestCase[] = [];

  projects: Project[] = [];

  testers: Tester[] = [];

  loading = false;

  editingTestCase: TestCase | null = null;

  selectedProject: Project | null = null;
  selectedTester: Tester | null = null;
  selectedManualTester: Tester | null = null;

  filteredTestCases: TestCase[] = [];
  paginatedTestCases: TestCase[] = [];

  searchTerm = "";

  showPopup = false;

  showDialog = false;

  showTestCaseOptions: boolean = false;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 20;

  // Sorting properties
  currentSort = { column: "", direction: "asc" };

  statusOptions = [
    {
      value: "Ready to Automate",
      label: "Ready to Automate",
      color: "bg-info",
    },
    { value: "Automated", label: "Automated", color: "bg-success" },
    { value: "In Progress", label: "In Progress", color: "bg-warning" },
    { value: "Completed", label: "Failed", color: "bg-danger" },
    { value: "Cannot be Automated", label: "Cannot be Automated", color: "bg-dark" },
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private appService: AppService,
  ) {
    this.testCaseForm = this.fb.group({
      title: ["", [Validators.required, Validators.minLength(5)]],
      description: ["", [Validators.required, Validators.minLength(3)]],
      projectId: ["", Validators.required],
      testerId: ["", Validators.required],
      status: ["Ready to Automate", Validators.required],
      priority: ["Medium", Validators.required],
      testCaseType: ["UI", Validators.required],
      toolType: ["Selenium", Validators.required],
      manualTesterId: ["", Validators.required],
    });
    this.showTestCaseOptions =
      this.appService.hasWritePermission || this.appService.hasAdminPermission;
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadTesters();
    this.loadTestCases();
  }

  onSubmit(): void {
    if (this.testCaseForm.valid) {
      this.loading = true;
      const testCaseData = this.testCaseForm.value;

      if (this.editingTestCase) {
        this.apiService
          .updateTestCase(this.editingTestCase.id, testCaseData)
          .subscribe(
            (response) => {
              this.loadTestCases();
              this.resetForm();
              this.loading = false;
            },
            (error) => {
              console.error("Error updating test case:", error);
              this.loading = false;
            },
          );
      } else {
        this.apiService.createTestCase(testCaseData).subscribe(
          (response) => {
            this.loadTestCases();
            this.resetForm();
            this.loading = false;
          },
          (error) => {
            console.error("Error creating test case:", error);
            this.loading = false;
          },
        );
      }
    }
  }

  loadProjects(): void {
    this.apiService.getProjects().subscribe(
      (data: Project[]) => {
        this.projects = data;
      },
      (error) => {
        console.error("Error loading projects:", error);
      },
    );
  }

  loadTesters(): void {
    this.apiService.getTesters().subscribe(
      (data: Tester[]) => {
        this.testers = data;
      },
      (error) => {
        console.error("Error loading testers:", error);
      },
    );
  }

  loadTestCases(): void {
    this.apiService.getTestCases().subscribe(
      (data: TestCase[]) => {
        this.testCases = data;
        this.applyFilters();
      },
      (error) => {
        console.error("Error loading test cases:", error);
      },
    );
  }

  onProjectFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filtering
    this.applyFilters();
  }

  onTesterFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filtering
    this.applyFilters();
  }

  onManualTesterFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filtering
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.testCases;

    // Apply project filter
    if (this.selectedProject) {
      filtered = filtered.filter(
        (tc) => tc.projectId === this.selectedProject!.id,
      );
    }

    // Apply tester filter
    if (this.selectedTester) {
      filtered = filtered.filter(
        (tc) => tc.testerId === this.selectedTester!.id,
      );
    }

    // Apply manual tester filter
    if (this.selectedManualTester) {
      filtered = filtered.filter(
        (tc) => tc.manualTesterId === this.selectedManualTester!.id,
      );
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tc) =>
          tc.title.toLowerCase().includes(searchLower) ||
          tc.description.toLowerCase().includes(searchLower),
      );
    }

    this.filteredTestCases = filtered;
    this.updatePagination();
  }

  // Pagination methods
  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedTestCases = this.filteredTestCases.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTestCases.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Reset filters and pagination
  resetFilters(): void {
    this.searchTerm = "";
    this.selectedProject = null;
    this.selectedTester = null;
    this.selectedManualTester = null;
    this.currentSort = { column: "", direction: "asc" };
    this.currentPage = 1;
    this.applyFilters();
  }

  sortTable(column: string): void {
    if (this.currentSort.column === column) {
      this.currentSort.direction =
        this.currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = "asc";
    }

    this.filteredTestCases.sort((a, b) => {
      let aVal: any = a[column as keyof TestCase];
      let bVal: any = b[column as keyof TestCase];

      // Handle different data types
      if (column === "projectId") {
        aVal = this.getProjectName(aVal);
        bVal = this.getProjectName(bVal);
      } else if (column === "testerId") {
        aVal = this.getTesterName(aVal);
        bVal = this.getTesterName(bVal);
      } else if (column === "manualTesterId") {
        aVal = this.getTesterName(aVal);
        bVal = this.getTesterName(bVal);
      }

      // Convert to strings for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (this.currentSort.direction === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Update pagination after sorting
    this.updatePagination();
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

  editTestCase(testCase: TestCase): void {
    this.editingTestCase = testCase;
    this.testCaseForm.patchValue({
      title: testCase.title,
      description: testCase.description,
      projectId: testCase.projectId,
      testerId: testCase.testerId,
      status: testCase.status,
      priority: testCase.priority,
      testCaseType: testCase.testCaseType,
      toolType: testCase.toolType,
      manualTesterId: testCase.manualTesterId,
    });
    this.showDialog = true;
  }

  deleteTestCase(id: number): void {
    if (confirm("Are you sure you want to delete this test case?")) {
      this.apiService.deleteTestCase(id).subscribe(
        () => {
          this.loadTestCases();
        },
        (error) => {
          console.error("Error deleting test case:", error);
        },
      );
    }
  }

  resetForm(): void {
    this.testCaseForm.reset();
    this.testCaseForm.patchValue({
      status: "Ready to Automate",
      priority: "Medium",
    });
    this.editingTestCase = null;
    this.showDialog = false;
  }

  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find((s) => s.value === status);

    return statusOption ? statusOption.color : "bg-secondary";
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case "High":
        return "bg-danger";
      case "Medium":
        return "bg-warning";
      case "Low":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find((p) => p.id === projectId);

    return project ? project.name : "Unknown Project";
  }

  getTesterName(testerId: number): string {
    const tester = this.testers.find((t) => t.id === testerId);

    return tester ? tester.name : "-";
  }

  togglePopUp(): void {
    this.showPopup = !this.showPopup;
  }

  trackByTestCase(index: number, testCase: any): number {
    return testCase.id;
  }
  /**
   * Returns an array of page numbers to display in pagination
   * Shows current page ± 2 pages, excluding first and last page
   */
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages;
    const current = this.currentPage;

    // Always show first and last, so we only calculate middle pages
    // We want to show current page ± 2 pages

    let startPage = Math.max(2, current - 2);
    let endPage = Math.min(totalPages - 1, current + 2);

    // Adjust if we're near the beginning
    if (current <= 4) {
      endPage = Math.min(5, totalPages - 1);
    }

    // Adjust if we're near the end
    if (current >= totalPages - 3) {
      startPage = Math.max(2, totalPages - 4);
    }

    // Generate the array of page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}