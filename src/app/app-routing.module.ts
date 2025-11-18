import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { TesterRegistrationComponent } from "./components/tester-registration/tester-registration.component";
import { TesterMetricsComponent } from "./components/tester-metrics/tester-metrics.component";
import { ProjectManagementComponent } from "./components/project-management/project-management.component";
import { TestCaseTrackingComponent } from "./components/test-case-tracking/test-case-tracking.component";
import { BulkUploadComponent } from "./components/bulk-upload/bulk-upload.component";
import { JenkinsResultsComponent } from "./components/jenkins-results/jenkins-results.component";
import { ManualCoverageComponent } from "./components/manual-coverage/manual-coverage.component";
import { authGuard } from "./auth.guard";
import { UnauthorizedComponent } from "./components/unauthorized/unauthorized.component";
import { OktaAuthGuard, OktaCallbackComponent } from "@okta/okta-angular";
import { AccessGuard } from "./access.guard";

const routes: Routes = [
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "testers",
    component: TesterRegistrationComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "testers/:id/metrics",
    component: TesterMetricsComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "projects",
    component: ProjectManagementComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "test-cases",
    component: TestCaseTrackingComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "manual-coverage",
    component: ManualCoverageComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "bulk-upload",
    component: BulkUploadComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "jenkins-results",
    component: JenkinsResultsComponent,
    canActivate: [OktaAuthGuard, AccessGuard],
  },
  {
    path: "login/callback",
    component: OktaCallbackComponent,
  },
  { path: "unauthorized", component: UnauthorizedComponent },
    { path: "**", redirectTo: "/dashboard", pathMatch: "full" },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
