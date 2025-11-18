import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { Project, Domain } from "../../models/project.model";
import { AppService } from "../../services/app.service";
import { PrimeTemplate } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { Button } from "primeng/button";
import { NgIf, NgFor, DatePipe } from "@angular/common";
import { Severity } from "../../models/utils";

@Component({
  selector: "app-project-management",
  templateUrl: "./project-management.component.html",
  styleUrls: ["./project-management.component.scss"],
  standalone: true,
  imports: [
    NgIf,
    Button,
    FormsModule,
    NgFor,
    DialogModule,
    PrimeTemplate,
    ReactiveFormsModule,
    DatePipe,
  ],
})
export class ProjectManagementComponent implements OnInit {
  projectForm: FormGroup;

  projects: Project[] = [];

  domains: Domain[] = [];

  filteredProjects: Project[] = [];

  loading = false;

  editingProject: Project | null = null;

  selectedDomainFilter = "";

  showRegistration = false;

  showDialog = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private appService: AppService,
  ) {
    this.projectForm = this.fb.group({
      domainId: ["", Validators.required],
      name: ["", [Validators.required, Validators.minLength(3)]],
      description: ["", [Validators.required, Validators.minLength(10)]],
      status: ["Active", Validators.required],
      // NEW: Jira configuration fields
      jiraProjectKey: [""],
      jiraBoardId: ["", [Validators.pattern(/^\d*$/)]], // Only numeric values
    });
    this.showRegistration = this.appService.hasAdminPermission;
  }

  ngOnInit(): void {
    this.loadDomains();
    this.loadProjects();
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

  onSubmit(): void {
    if (this.projectForm.valid) {
      this.loading = true;
      const formData = this.projectForm.value;

      // Create project data with domain reference and Jira configuration
      const projectData: any = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        domain: {
          id: formData.domainId,
        },
        // NEW: Include Jira configuration fields
        jiraProjectKey: formData.jiraProjectKey?.trim() || null,
        jiraBoardId: formData.jiraBoardId?.trim() || null,
      };

      if (this.editingProject) {
        this.apiService
          .updateProject(this.editingProject.id, projectData)
          .subscribe(
            (response) => {
              this.loadProjects();
              this.resetForm();
              this.loading = false;
              console.log("Project updated successfully:", response);
            },
            (error) => {
              console.error("Error updating project:", error);
              this.appService.showToast({
                severity: Severity.error,
                summary: "Error",
                detail:
                  "Error updating project: " + (error.error || error.message),
              });
              this.loading = false;
            },
          );
      } else {
        this.apiService.createProject(projectData).subscribe(
          (response) => {
            this.loadProjects();
            this.resetForm();
            this.loading = false;
            console.log("Project created successfully:", response);
          },
          (error) => {
            console.error("Error creating project:", error);
            this.appService.showToast({
              severity: Severity.error,
              summary: "Error",
              detail:
                "Error creating project: " + (error.error || error.message),
            });
            this.loading = false;
          },
        );
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.projectForm.controls).forEach((key) => {
        this.projectForm.get(key)?.markAsTouched();
      });
    }
  }

  loadProjects(): void {
    this.apiService.getProjects().subscribe(
      (data: Project[]) => {
        this.projects = data;
        this.applyDomainFilter();
      },
      (error) => {
        console.error("Error loading projects:", error);
      },
    );
  }

  onDomainFilterChange(): void {
    this.applyDomainFilter();
  }

  applyDomainFilter(): void {
    if (this.selectedDomainFilter) {
      this.filteredProjects = this.projects.filter(
        (project) =>
          project.domain &&
          project.domain.id.toString() === this.selectedDomainFilter,
      );
    } else {
      this.filteredProjects = [...this.projects];
    }
  }

  editProject(project: Project): void {
    this.editingProject = project;
    this.projectForm.patchValue({
      domainId: project.domain ? project.domain.id : "",
      name: project.name,
      description: project.description,
      status: project.status,
      // NEW: Populate Jira configuration fields
      jiraProjectKey: project.jiraProjectKey || "",
      jiraBoardId: project.jiraBoardId || "",
    });
    this.showDialog = true;
  }

  deleteProject(id: number): void {
    if (
      confirm(
        "Are you sure you want to delete this project? This will also delete all associated test cases.",
      )
    ) {
      this.apiService.deleteProject(id).subscribe(
        () => {
          this.loadProjects();
          console.log("Project deleted successfully");
        },
        (error) => {
          console.error("Error deleting project:", error);
          this.appService.showToast({
            severity: Severity.error,
            summary: "Error",
            detail: "Error deleting project: " + (error.error || error.message),
          });
        },
      );
    }
  }

  resetForm(): void {
    this.projectForm.reset();
    this.projectForm.patchValue({
      status: "Active",
      jiraProjectKey: "",
      jiraBoardId: "",
    });
    this.editingProject = null;
    this.showDialog = false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "Active":
        return "bg-success";
      case "Inactive":
        return "bg-danger";
      case "Completed":
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  }

  getDomainName(domainId: number): string {
    const domain = this.domains.find((d) => d.id === domainId);

    return domain ? domain.name : "Unknown Domain";
  }

  // NEW: Helper methods for Jira configuration
  hasJiraConfiguration(project: Project): boolean {
    return !!(project.jiraProjectKey && project.jiraBoardId);
  }

  getJiraConfigurationDisplay(project: Project): string {
    if (!this.hasJiraConfiguration(project)) {
      return "Not configured";
    }

    return `${project.jiraProjectKey} | Board: ${project.jiraBoardId}`;
  }

  // NEW: Validation helper for Jira Board ID
  onJiraBoardIdInput(event: any): void {
    // Only allow numeric input
    const value = event.target.value;
    const numericValue = value.replace(/[^0-9]/g, "");
    if (value !== numericValue) {
      this.projectForm.patchValue({ jiraBoardId: numericValue });
    }
  }

  // NEW: Transform Jira Project Key to uppercase
  onJiraProjectKeyInput(event: any): void {
    const value = event.target.value.toUpperCase();
    this.projectForm.patchValue({ jiraProjectKey: value });
  }
}
