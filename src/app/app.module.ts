import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { TesterRegistrationComponent } from "./components/tester-registration/tester-registration.component";
import { ProjectManagementComponent } from "./components/project-management/project-management.component";
import { TestCaseTrackingComponent } from "./components/test-case-tracking/test-case-tracking.component";
import { BulkUploadComponent } from "./components/bulk-upload/bulk-upload.component";
import { JenkinsResultsComponent } from "./components/jenkins-results/jenkins-results.component";
import { ManualCoverageComponent } from "./components/manual-coverage/manual-coverage.component";

import { DropdownModule } from "primeng/dropdown";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DialogModule } from "primeng/dialog";

import { ApiService } from "./services/api.service";

// Custom Pipe for filtering (if needed)
import { Pipe, PipeTransform } from "@angular/core";
import { LoginDashboardComponent } from "./components/login-dashboard/login-dashboard.component";
import { AuthInterceptor } from "./auth.interceptor";

@Pipe({ name: "filter" })
export class FilterPipe implements PipeTransform {
  transform(items: any[], field: string, value: any): any[] {
    if (!items || !field || value === undefined) {
      return items;
    }
    return items.filter((item) => item[field] === value);
  }
}

@Pipe({ name: "keyvalue" })
export class KeyValuePipe implements PipeTransform {
  transform(value: any): any[] {
    if (!value) {
      return [];
    }
    return Object.keys(value).map(key => ({ key: key, value: value[key] }));
  }
}

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TesterRegistrationComponent,
    ProjectManagementComponent,
    TestCaseTrackingComponent,
    BulkUploadComponent,
    JenkinsResultsComponent,
    ManualCoverageComponent,
    FilterPipe,
    KeyValuePipe,
    LoginDashboardComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    DropdownModule,
    ButtonModule,
    CardModule,
    DialogModule,
  ],
  providers: [ApiService, {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }],
  bootstrap: [AppComponent],
})
export class AppModule {}