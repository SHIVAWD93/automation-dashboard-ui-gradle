import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { TesterRegistrationComponent } from "./components/tester-registration/tester-registration.component";
import { ProjectManagementComponent } from "./components/project-management/project-management.component";
import { TestCaseTrackingComponent } from "./components/test-case-tracking/test-case-tracking.component";
import { BulkUploadComponent } from "./components/bulk-upload/bulk-upload.component";
import { JenkinsResultsComponent } from "./components/jenkins-results/jenkins-results.component";
import { ManualCoverageComponent } from "./components/manual-coverage/manual-coverage.component";
import { LoginDashboardComponent } from "./components/login-dashboard/login-dashboard.component";
import { AuthGuard } from "./auth.guard";

const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "testers",
    component: TesterRegistrationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "projects",
    component: ProjectManagementComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "test-cases",
    component: TestCaseTrackingComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "manual-coverage",
    component: ManualCoverageComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "bulk-upload",
    component: BulkUploadComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "jenkins-results",
    component: JenkinsResultsComponent,
    canActivate: [AuthGuard],
  },
  { path: "login", component: LoginDashboardComponent },

  { path: "**", redirectTo: "/login" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}