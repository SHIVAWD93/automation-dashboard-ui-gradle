import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { Tester } from "../../models/tester.model";
import { AppService } from "../../services/app.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-tester-registration",
  templateUrl: "./tester-registration.component.html",
  styleUrls: ["./tester-registration.component.css"],
})
export class TesterRegistrationComponent implements OnInit {
  testerForm: FormGroup;
  testers: Tester[] = [];
  loading = false;
  selectedFile: any = null;
  previewUrl: string | ArrayBuffer | null = null;
  showRegistration: boolean = false;
  showDialog: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private appService: AppService
  ) {
    this.testerForm = this.fb.group({
      name: ["", [Validators.required, Validators.minLength(2)]],
      role: ["", Validators.required],
      gender: ["", Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]], // Added experience field
    });
    this.showRegistration =
      this.appService.userPermission === environment.appWrite;
  }

  ngOnInit(): void {
    this.loadTesters();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const dataUrl = e.target.result as string;
        this.previewUrl = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.testerForm.valid) {
      this.loading = true;

      // Create tester data object
      const testerData: Partial<Tester> = {
        name: this.testerForm.get("name")?.value,
        role: this.testerForm.get("role")?.value,
        gender: this.testerForm.get("gender")?.value,
        experience: this.testerForm.get("experience")?.value || 0,
      };

      // If there's a file, create FormData, otherwise send JSON
      if (this.selectedFile) {
        const formData = new FormData();
        formData.append("name", testerData.name!);
        formData.append("role", testerData.role!);
        formData.append("gender", testerData.gender!);
        formData.append("experience", testerData.experience!.toString());
        formData.append("profileImage", this.selectedFile);

        // You'll need to add this method to your API service for file upload
        this.apiService.createTesterWithImage(formData).subscribe(
          (response) => {
            console.log("Tester created successfully:", response);
            this.loadTesters();
            this.resetForm();
            this.loading = false;
            this.showDialog = false;
          },
          (error) => {
            console.error("Error creating tester:", error);
            this.loading = false;
          }
        );
      } else {
        // Send as JSON without file
        this.apiService.createTester(testerData as Tester).subscribe(
          (response) => {
            console.log("Tester created successfully:", response);
            this.loadTesters();
            this.resetForm();
            this.loading = false;
            this.showDialog = false;
          },
          (error) => {
            console.error("Error creating tester:", error);
            this.loading = false;
          }
        );
      }
    }
  }

  loadTesters(): void {
    console.log("Loading testers..."); // Debug log
    this.apiService.getTesters().subscribe(
      (data: Tester[]) => {
        this.testers = data;
      },
      (error) => {
        // Set empty array on error to prevent undefined issues
        this.testers = [];
      }
    );
  }

  deleteTester(id: number): void {
    if (confirm("Are you sure you want to delete this tester?")) {
      this.apiService.deleteTester(id).subscribe(
        () => {
          console.log("Tester deleted successfully");
          this.loadTesters();
        },
        (error) => {
          console.error("Error deleting tester:", error);
        }
      );
    }
  }

  resetForm(): void {
    this.testerForm.reset({
      name: "",
      role: "",
      gender: "",
      experience: 0, // Default value for experience
    });
    this.testerForm.updateValueAndValidity();
    this.selectedFile = null;
    this.previewUrl = null;
  }

  getRoleColor(role: string): string {
    switch (role) {
      case "Manual Tester":
        return "bg-primary";
      case "Automation Tester":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  }
}
