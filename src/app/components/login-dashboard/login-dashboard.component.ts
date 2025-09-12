import { Component, EventEmitter, Output } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AppService } from "../../services/app.service";
import { Router } from "@angular/router";
import { SessionStorageService } from "../../services/session-storage.service";

@Component({
  selector: "app-login-dashboard",
  templateUrl: "./login-dashboard.component.html",
  styleUrl: "./login-dashboard.component.scss",
})
export class LoginDashboardComponent {
  loginForm!: FormGroup;
  registrationForm!: FormGroup;
  roles: string[] = ["User", "Admin", "Manager"];
  showlogin: boolean = true;
  isLoading = false;
  errorMessage = "";
  showPassword = false;
  @Output() authenticated = new EventEmitter<boolean>();

  constructor(
    private fb: FormBuilder,
    private appService: AppService,
    private router: Router,
    private sessionStorageService: SessionStorageService
  ) {}

  ngOnInit(): void {
    this.sessionLogin();
    this.loginForm = this.fb.group({
      username: ["", Validators.required],
      password: ["", Validators.required],
    });
    this.registrationForm = this.fb.group({
      userName: ["", Validators.required],
      password: ["", [Validators.required, Validators.minLength(4)]],
      role: ["", Validators.required],
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.appService.getUserInfo(username, password).subscribe({
        next: (user: any) => {
          this.sessionStorageService.saveWithExpiry('userInfo', user, 3600000);
          this.appService.userPermission = user.permission;
          this.appService.token = user.token;
          this.appService.authenticated.next(true);
          this.authenticated.emit(true);
          this.router.navigate(["/dashboard"]);
        },
        error: (err: any) => {
          this.errorMessage = "User does not exist.";
          setTimeout(() => {
            this.errorMessage = "";
          }, 5000);
          this.appService.authenticated.next(false);
          this.authenticated.emit(false);
        },
      });
    }
  }

  registerUser() {
    const { userName, password, role } = this.registrationForm.value;

    let user = {
      userName: userName,
      password: password,
      role: role,
    };
    this.appService.registerUser(user).subscribe({
      next: (value: any) => {
        this.showlogin = !this.showlogin;
      },
      error: (err: any) => {
        this.errorMessage = "Unable to register";
        setTimeout(() => {
          this.errorMessage = "";
        }, 5000);
        console.error("Registration failed", err);
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors["required"]) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } is required`;
      }
      if (field.errors["minlength"]) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } must be at least ${
          field.errors["minlength"].requiredLength
        } characters`;
      }
    }
    return "";
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  sessionLogin(): void {
    let value = this.sessionStorageService.getWithExpiry("userInfo");
    if (value) {
      this.appService.userPermission = value.permission;
      this.appService.token = value.token;
      this.appService.authenticated.next(true);
      this.authenticated.emit(true);
      this.router.navigate(["/dashboard"]);
    }
  }
}
