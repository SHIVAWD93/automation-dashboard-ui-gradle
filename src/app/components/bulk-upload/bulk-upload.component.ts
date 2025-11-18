import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { Project } from "../../models/project.model";
import { Domain } from "../../models/domain.model";
import { Tester } from "../../models/tester.model";
import { TestCase } from "../../models/test-case.model";
import * as XLSX from "xlsx";
import { NgIf, NgFor } from "@angular/common";
import { PrimeTemplate } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { BulkUploadResult } from "../../models/bulk-upload-result";
import { ExcelTestCase } from "../../models/excel-test-case";
import { AppService } from "../../services/app.service";
import { Severity } from "../../models/utils";

@Component({
  selector: "app-bulk-upload",
  templateUrl: "./bulk-upload.component.html",
  styleUrls: ["./bulk-upload.component.scss"],
  standalone: true,
  imports: [
    DialogModule,
    PrimeTemplate,
    NgIf,
    FormsModule,
    ReactiveFormsModule,
    NgFor,
  ],
})
export class BulkUploadComponent implements OnInit {
  @Input() projects: Project[] = [];

  @Input() testers: Tester[] = [];

  @Input() isVisible = false;

  @Output() close = new EventEmitter<void>();

  @Output() uploadComplete = new EventEmitter<void>();

  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;

  uploadForm: FormGroup;

  domains: Domain[] = [];

  filteredProjects: Project[] = [];

  selectedFile: File | null = null;

  uploading = false;

  uploadResult: BulkUploadResult | null = null;

  showResult = false;

  dragOver = false;

  statusOptions = [
    "Ready to Automate",
    "Automated",
    "In Progress",
    "Completed",
  ];

  priorityOptions = ["High", "Medium", "Low"];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private appService: AppService,
  ) {
    this.uploadForm = this.fb.group({
      domainId: ["", Validators.required],
      projectId: ["", Validators.required],
      defaultTesterId: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadDomains();
    this.loadTesters(); // Add this line
    this.setupFormSubscriptions();
  }

  loadDomains(): void {
    this.apiService.getActiveDomains().subscribe(
      (data: Domain[]) => {
        this.domains = data;
      },
      (error) => {
        console.error("Error loading domains:", error);
      },
    );
  }

  setupFormSubscriptions(): void {
    // When domain changes, update projects list
    this.uploadForm.get("domainId")?.valueChanges.subscribe((domainId) => {
      if (domainId) {
        this.loadProjectsByDomain(domainId);
      } else {
        this.filteredProjects = [];
      }
      // Reset project selection when domain changes
      this.uploadForm.patchValue({ projectId: "" });
    });
  }

  loadProjectsByDomain(domainId: number): void {
    this.apiService.getProjectsByDomain(domainId).subscribe(
      (data: Project[]) => {
        this.filteredProjects = data.filter(
          (project) => project.status === "Active",
        );
      },
      (error) => {
        this.filteredProjects = [];
      },
    );
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  handleFileSelection(file: File): void {
    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      this.appService.showToast({
        severity: Severity.error,
        summary: "Invalid File",
        detail: "Please select a valid Excel file (.xlsx or .xls)",
      });

      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.appService.showToast({
        severity: Severity.error,
        summary: "File Size Exceeded",
        detail: "File size should be less than 5MB",
      });

      return;
    }

    this.selectedFile = file;
    this.uploadResult = null;
    this.showResult = false;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.uploadResult = null;
    this.showResult = false;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }

  downloadTemplate(): void {
    const selectedProject = this.filteredProjects.find(
      (p) => p.id === this.uploadForm.get("projectId")?.value,
    );

    // Create sample data for template
    const sampleData: ExcelTestCase[] = [
      {
        "Test Case Title": "Login with valid credentials",
        Description: "Verify user can login with valid username and password",
        Priority: "High",
        Status: "Ready to Automate",
        "Assigned Tester": "Unassigned",
        "Test Case Type": "UI",
        "Tool Type": "Selenium",
        "Manual Tester": "Unassigned",
      },
      {
        "Test Case Title": "Login with invalid credentials",
        Description:"Verify system shows error message for invalid credentials",
        Priority: "Medium",
        Status: "Ready to Automate",
        "Assigned Tester": "Unassigned",
        "Test Case Type": "UI",
        "Tool Type": "Selenium",
        "Manual Tester": "Unassigned",
      },
    ];

    // Create workbook and worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(sampleData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Cases");

    // Set column widths
    // Set column widths
    const colWidths = [
      { wch: 30 }, // Test Case Title
      { wch: 50 }, // Description
      { wch: 12 }, // Priority
      { wch: 18 }, // Status
      { wch: 20 }, // Assigned Tester
      { wch: 15 }, // Test Case Type
      { wch: 15 }, // Tool Type
      { wch: 20 }, // Manual Tester
    ];
    ws["!cols"] = colWidths;

    // Generate filename
    const projectName = selectedProject
      ? selectedProject.name.replace(/[^a-zA-Z0-9]/g, "_")
      : "Project";
    const domainName = this.getDomainName(
      this.uploadForm.get("domainId")?.value,
    );
    const filename = `TestCases_Template_${domainName}_${projectName}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile || !this.uploadForm.valid) {
      return;
    }

    this.uploading = true;
    this.uploadResult = null;
    this.showResult = false;

    try {
      const excelData = await this.parseExcelFile(this.selectedFile);
      const testCases = this.convertToTestCases(excelData);
      const result = await this.uploadTestCases(testCases);

      this.uploadResult = result;
      this.showResult = true;

      if (result.success) {
        this.uploadComplete.emit();
      }
    } catch (error) {
      this.uploadResult = {
        success: false,
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [
          "Failed to process file. Please check the file format and try again.",
        ],
        duplicates: [],
      };
      this.showResult = true;
    } finally {
      this.uploading = false;
    }
  }

  private parseExcelFile(file: File): Promise<ExcelTestCase[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(
            worksheet,
          ) as ExcelTestCase[];
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  private convertToTestCases(excelData: ExcelTestCase[]): TestCase[] {
    const projectId = this.uploadForm.get("projectId")?.value;
    const defaultTesterId = this.uploadForm.get("defaultTesterId")?.value;

    return excelData.map((row) => {
      // Find tester by name or use default
      let testerId = defaultTesterId;
      if (row["Assigned Tester"] && row["Assigned Tester"] !== "Unassigned") {
        const tester = this.testers.find(
          (t) => t.name.toLowerCase() === row["Assigned Tester"].toLowerCase(),
        );
        if (tester) {
          testerId = tester.id;
        }
      }

      // Find manual tester by name
      // Find manual tester by name
      let manualTesterId = null;
      if (row["Manual Tester"] && row["Manual Tester"] !== "Unassigned") {
        const manualTesterName = row["Manual Tester"];
        if (manualTesterName) {
          // Additional safety check
          const manualTester = this.testers.find(
            (t) => t.name.toLowerCase() === manualTesterName.toLowerCase(),
          );
          if (manualTester) {
            manualTesterId = manualTester.id;
          }
        }
      }

      // Create a partial TestCase object that matches the structure
      return {
        id: 0, // Temporary ID, will be assigned by backend
        title: row["Test Case Title"],
        description: row["Description"],
        projectId,
        testerId,
        priority: this.priorityOptions.includes(row["Priority"])
          ? row["Priority"]
          : "Medium",
        status: this.statusOptions.includes(row["Status"])
          ? row["Status"]
          : "Ready to Automate",
        testCaseType: row["Test Case Type"] || null,
        toolType: row["Tool Type"] || null,
        manualTesterId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TestCase;
    });
  }

  private async uploadTestCases(
    testCases: TestCase[],
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      success: true,
      totalRows: testCases.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duplicates: [],
    };

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        // Validate required fields
        if (!testCase.title || testCase.title.trim().length < 5) {
          result.errors.push(
            `Row ${i + 2}: Title is required and must be at least 5 characters long`,
          );
          result.errorCount++;
          continue;
        }

        if (!testCase.description || testCase.description.trim().length < 3) {
          result.errors.push(
            `Row ${i + 2}: Description is required and must be at least 3 characters long`,
          );
          result.errorCount++;
          continue;
        }

        // Check for duplicates (same title in same project)
        const existingTestCase = await this.checkForDuplicate(
          testCase.title,
          testCase.projectId,
        );
        if (existingTestCase) {
          result.duplicates.push(
            `Row ${i + 2}: Test case "${testCase.title}" already exists`,
          );
          result.errorCount++;
          continue;
        }

        // Create test case
        await this.apiService.createTestCase(testCase).toPromise();
        result.successCount++;
      } catch (error) {
        result.errors.push(
          `Row ${i + 2}: Failed to create test case - ${error}`,
        );
        result.errorCount++;
      }
    }

    result.success = result.errorCount === 0;

    return result;
  }

  private async checkForDuplicate(
    title: string,
    projectId: number,
  ): Promise<boolean> {
    try {
      // Check if the method exists in ApiService
      if (this.apiService.getTestCasesByProject) {
        const projectTestCases = await this.apiService
          .getTestCasesByProject(projectId)
          .toPromise();

        // Add null/undefined check
        if (!projectTestCases) {
          return false;
        }

        return projectTestCases.some(
          (tc: TestCase) => tc.title.toLowerCase() === title.toLowerCase(),
        );
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  closeModal(): void {
    this.selectedFile = null;
    this.uploadResult = null;
    this.showResult = false;
    this.uploadForm.reset();
    this.filteredProjects = [];
    this.close.emit();
  }

  getDomainName(domainId: number): string {
    const domain = this.domains.find((d) => d.id === domainId);

    return domain
      ? domain.name.replace(/[^a-zA-Z0-9]/g, "_")
      : "Unknown_Domain";
  }

  getProjectName(projectId: number): string {
    const project = this.filteredProjects.find((p) => p.id === projectId);

    return project ? project.name : "Unknown Project";
  }

  getTesterName(testerId: number): string {
    const tester = this.testers.find((t) => t.id === testerId);

    return tester ? tester.name : "Unknown Tester";
  }

  // Add this method to load testers
  loadTesters(): void {
    this.apiService.getTesters().subscribe(
      (data: Tester[]) => {
        this.testers = data || []; // Ensure it's always an array
      },
      (error) => {
        this.testers = []; // Set empty array on error
      },
    );
  }
}
