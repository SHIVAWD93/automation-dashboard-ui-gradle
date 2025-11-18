import { Injectable } from "@angular/core";
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
  HttpParams,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Project } from "../models/project.model";
import { Domain } from "../models/project.model";
import { TestCase } from "../models/test-case.model";
import { Tester } from "../models/tester.model";
import {
  JenkinsResult,
  JenkinsTestCase,
  JenkinsStatistics,
  JenkinsConnectionTest,
  JenkinsFilters,
} from "../models/jenkins.model";
import { environment } from "../../environments/environment";
import { Feedback, FeedbackRequest } from "../models/feedback";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private baseUrl = environment.clientUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    }),
  };

  constructor(private http: HttpClient) {}

  // Domain API methods
  getDomains(): Observable<Domain[]> {
    return this.http
      .get<Domain[]>(`${this.baseUrl}/domains`)
      .pipe(catchError(this.handleError));
  }

  getActiveDomains(): Observable<Domain[]> {
    return this.http
      .get<Domain[]>(`${this.baseUrl}/domains/active`)
      .pipe(catchError(this.handleError));
  }

  getDomainById(id: number): Observable<Domain> {
    return this.http
      .get<Domain>(`${this.baseUrl}/domains/${id}`)
      .pipe(catchError(this.handleError));
  }

  createDomain(domain: Domain): Observable<Domain> {
    return this.http
      .post<Domain>(`${this.baseUrl}/domains`, domain, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateDomain(id: number, domain: Domain): Observable<Domain> {
    return this.http
      .put<Domain>(`${this.baseUrl}/domains/${id}`, domain, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  deleteDomain(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/domains/${id}`)
      .pipe(catchError(this.handleError));
  }

  getDomainsByStatus(status: string): Observable<Domain[]> {
    return this.http
      .get<Domain[]>(`${this.baseUrl}/domains/status/${status}`)
      .pipe(catchError(this.handleError));
  }

  // Project API methods
  getProjects(): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${this.baseUrl}/projects`)
      .pipe(catchError(this.handleError));
  }

  getProjectById(id: number): Observable<Project> {
    return this.http
      .get<Project>(`${this.baseUrl}/projects/${id}`)
      .pipe(catchError(this.handleError));
  }

  createProject(project: any): Observable<Project> {
    return this.http
      .post<Project>(`${this.baseUrl}/projects`, project, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateProject(id: number, project: any): Observable<Project> {
    return this.http
      .put<Project>(`${this.baseUrl}/projects/${id}`, project, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  deleteProject(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/projects/${id}`)
      .pipe(catchError(this.handleError));
  }

  getProjectsByDomain(domainId: number): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${this.baseUrl}/projects/domain/${domainId}`)
      .pipe(catchError(this.handleError));
  }

  getProjectsByDomainAndStatus(
    domainId: number,
    status: string,
  ): Observable<Project[]> {
    return this.http
      .get<
        Project[]
      >(`${this.baseUrl}/projects/domain/${domainId}/status/${status}`)
      .pipe(catchError(this.handleError));
  }

  getProjectsByStatus(status: string): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${this.baseUrl}/projects/status/${status}`)
      .pipe(catchError(this.handleError));
  }

  // Test Case API methods
  getTestCases(): Observable<TestCase[]> {
    return this.http
      .get<TestCase[]>(`${this.baseUrl}/testcases`)
      .pipe(catchError(this.handleError));
  }

  getTestCaseById(id: number): Observable<TestCase> {
    return this.http
      .get<TestCase>(`${this.baseUrl}/testcases/${id}`)
      .pipe(catchError(this.handleError));
  }

  createTestCase(testCase: TestCase): Observable<TestCase> {
    return this.http
      .post<TestCase>(`${this.baseUrl}/testcases`, testCase, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateTestCase(id: number, testCase: TestCase): Observable<TestCase> {
    return this.http
      .put<TestCase>(
        `${this.baseUrl}/testcases/${id}`,
        testCase,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  deleteTestCase(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/testcases/${id}`)
      .pipe(catchError(this.handleError));
  }

  getTestCasesByProject(projectId: number): Observable<TestCase[]> {
    return this.http
      .get<TestCase[]>(`${this.baseUrl}/testcases/project/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  getTestCasesByDomain(domainId: number): Observable<TestCase[]> {
    return this.http
      .get<TestCase[]>(`${this.baseUrl}/testcases/domain/${domainId}`)
      .pipe(catchError(this.handleError));
  }

  // Tester API methods
  getTesters(): Observable<Tester[]> {
    return this.http
      .get<Tester[]>(`${this.baseUrl}/testers`)
      .pipe(catchError(this.handleError));
  }

  getTesterById(id: number): Observable<Tester> {
    return this.http
      .get<Tester>(`${this.baseUrl}/testers/${id}`)
      .pipe(catchError(this.handleError));
  }

  createTester(tester: Tester): Observable<Tester> {
    return this.http
      .post<Tester>(`${this.baseUrl}/testers`, tester, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // Tester API methods with file upload support
  createTesterWithImage(formData: FormData): Observable<Tester> {
    // Note: Don't set Content-Type header for FormData, let browser set it
    return this.http
      .post<Tester>(`${this.baseUrl}/testers/with-image`, formData)
      .pipe(catchError(this.handleError));
  }

  updateTester(id: number, tester: Tester): Observable<Tester> {
    return this.http
      .put<Tester>(`${this.baseUrl}/testers/${id}`, tester, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  deleteTester(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/testers/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Dashboard API methods
  getDashboardStats(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/dashboard/stats`)
      .pipe(catchError(this.handleError));
  }

  getDomainStats(domainId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/dashboard/stats/domain/${domainId}`)
      .pipe(catchError(this.handleError));
  }

  getProjectStats(projectId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/dashboard/stats/project/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  // Bulk upload API methods
  bulkUploadTestCases(formData: FormData): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/testcases/bulk-upload`, formData)
      .pipe(catchError(this.handleError));
  }

  // Jenkins API methods
  getJenkinsResults(): Observable<JenkinsResult[]> {
    return this.http
      .get<JenkinsResult[]>(`${this.baseUrl}/jenkins/results`)
      .pipe(catchError(this.handleError));
  }

  // NEW: Filtered Jenkins results method
  getFilteredJenkinsResults(
    filters: JenkinsFilters,
  ): Observable<JenkinsResult[]> {
    let params = new HttpParams();

    if (filters.projectId) {
      params = params.set("projectId", filters.projectId.toString());
    }
    if (filters.automationTesterId) {
      params = params.set(
        "automationTesterId",
        filters.automationTesterId.toString(),
      );
    }
    if (filters.jobFrequency) {
      params = params.set("jobFrequency", filters.jobFrequency);
    }
    if (filters.buildStatus) {
      params = params.set("buildStatus", filters.buildStatus);
    }
    if (filters.searchTerm) {
      params = params.set("searchTerm", filters.searchTerm);
    }
    if (filters.passPercentageThreshold) {
      params = params.set(
        "passPercentageThreshold",
        filters.passPercentageThreshold.toString(),
      );
    }

    return this.http
      .get<
        JenkinsResult[]
      >(`${this.baseUrl}/jenkins/results/filtered`, { params })
      .pipe(catchError(this.handleError));
  }

  // NEW: Get projects that have Jenkins results
  getProjectsWithJenkinsResults(): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${this.baseUrl}/jenkins/projects`)
      .pipe(catchError(this.handleError));
  }

  // NEW: Get unique job frequencies
  getJobFrequencies(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}/jenkins/frequencies`)
      .pipe(catchError(this.handleError));
  }

  // NEW: Get automation testers that have Jenkins results
  getAutomationTestersWithJenkinsResults(): Observable<Tester[]> {
    return this.http
      .get<Tester[]>(`${this.baseUrl}/jenkins/automation-testers`)
      .pipe(catchError(this.handleError));
  }

  getJenkinsResultByJobName(jobName: string): Observable<JenkinsResult> {
    return this.http
      .get<JenkinsResult>(`${this.baseUrl}/jenkins/results/${jobName}`)
      .pipe(catchError(this.handleError));
  }

  getJenkinsTestCases(resultId: number): Observable<JenkinsTestCase[]> {
    return this.http
      .get<
        JenkinsTestCase[]
      >(`${this.baseUrl}/jenkins/results/${resultId}/testcases`)
      .pipe(catchError(this.handleError));
  }

  getJenkinsStatistics(): Observable<JenkinsStatistics> {
    return this.http
      .get<JenkinsStatistics>(`${this.baseUrl}/jenkins/statistics`)
      .pipe(catchError(this.handleError));
  }

  syncJenkinsJobs(): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/jenkins/sync`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  syncSingleJenkinsJob(jobName: string): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/jenkins/sync/${jobName}`,
        {},
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  testJenkinsConnection(): Observable<JenkinsConnectionTest> {
    return this.http
      .get<JenkinsConnectionTest>(`${this.baseUrl}/jenkins/test-connection`)
      .pipe(catchError(this.handleError));
  }

  // New TestNG specific methods
  generateJenkinsTestNGReport(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/jenkins/testng/report`)
      .pipe(catchError(this.handleError));
  }

  getDetailedJenkinsTestCases(
    jobName: string,
    buildNumber: string,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${this.baseUrl}/jenkins/testng/${jobName}/${buildNumber}/testcases`,
      )
      .pipe(catchError(this.handleError));
  }

  syncAndGenerateJenkinsReport(): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/jenkins/testng/sync-and-report`,
        {},
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // Manual Page / Jira Integration Methods
  // ENHANCED: Manual Coverage methods with optional Jira configuration
  getJiraSprints(
    jiraProjectKey?: string,
    jiraBoardId?: string,
  ): Observable<any[]> {
    let params = new HttpParams();
    if (jiraProjectKey) {
      params = params.set("jiraProjectKey", jiraProjectKey);
    }
    if (jiraBoardId) {
      params = params.set("jiraBoardId", jiraBoardId);
    }

    return this.http
      .get<any[]>(`${this.baseUrl}/manual-page/sprints`, { params })
      .pipe(catchError(this.handleError));
  }

  syncSprintIssues(
    sprintId: string,
    jiraProjectKey?: string,
    jiraBoardId?: string,
  ): Observable<any[]> {
    let params = new HttpParams();
    if (jiraProjectKey) {
      params = params.set("jiraProjectKey", jiraProjectKey);
    }
    if (jiraBoardId) {
      params = params.set("jiraBoardId", jiraBoardId);
    }

    return this.http
      .post<
        any[]
      >(`${this.baseUrl}/manual-page/sprints/${sprintId}/sync`, {}, { params })
      .pipe(catchError(this.handleError));
  }

  getSprintIssues(sprintId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/manual-page/sprints/${sprintId}/issues`)
      .pipe(catchError(this.handleError));
  }

  updateTestCaseAutomationFlags(
    testCaseId: number,
    flags: { canBeAutomated: boolean; cannotBeAutomated: boolean },
  ): Observable<any> {
    return this.http
      .put<any>(
        `${this.baseUrl}/manual-page/test-cases/${testCaseId}/automation-flags`,
        flags,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  mapTestCase(
    testCaseId: number,
    mapping: { projectId: number; testerId: number },
  ): Observable<any> {
    return this.http
      .put<any>(
        `${this.baseUrl}/manual-page/test-cases/${testCaseId}/mapping`,
        mapping,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // Update test case information (project, tester, domain)
  updateTestCaseInformation(
    testCaseId: number,
    updateData: {
      projectId?: number | null;
      testerId?: number | null;
      domainId?: number | null;
    },
  ): Observable<any> {
    // Use the existing mapping endpoint but with the new structure
    const mappingData = {
      projectId: updateData.projectId,
      testerId: updateData.testerId,
      // Note: domainId will be handled by project selection
    };

    console.log("Sending mapping request to backend:", {
      endpoint: `${this.baseUrl}/manual-page/test-cases/${testCaseId}/mapping`,
      data: mappingData,
    });

    return this.http
      .put<any>(
        `${this.baseUrl}/manual-page/test-cases/${testCaseId}/mapping`,
        mappingData,
        this.httpOptions,
      )
      .pipe(
        catchError((error) => {
          console.error("Mapping endpoint error:", {
            status: error.status,
            message: error.message,
            url: error.url,
            data: mappingData,
          });

          return this.handleError(error);
        }),
      );
  }

  saveManualTestCase(
    testCaseId: any,
    canBeAutomated: boolean,
    cannotBeAutomated: boolean,
    projectId: any,
    testerId: any,
    domainId: any,
    testCaseType?: string | null,
    toolType?: string | null,
    manualTesterId?: number | null,
  ): Observable<any> {
    const mappingData = {
      projectId,
      testerId,
      domainId,
      canBeAutomated,
      cannotBeAutomated,
      testCaseType,
      toolType,
      manualTesterId,
    };

    return this.http.put<any>(
      `${this.baseUrl}/manual-page/test-cases/${testCaseId}/save`,
      mappingData,
      this.httpOptions,
    );
  }

  searchKeywordInComments(
    jiraKey: string,
    request: { keyword: string },
  ): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/manual-page/issues/${jiraKey}/keyword-search`,
        request,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // Global keyword search across all Jira tickets
  globalKeywordSearch(
    keyword: string,
    jiraProjectKey?: string,
    sprintId?: string,
  ): Observable<any> {
    const request: any = {
      keyword,
      jiraProjectKey: jiraProjectKey || "",
    };
    if (sprintId) {
      request.sprintId = sprintId;
    }

    return this.http
      .post<any>(
        `${this.baseUrl}/manual-page/global-keyword-search`,
        request,
        this.httpOptions,
      )
      .pipe(
        catchError((error) => {
          // If the global search endpoint doesn't exist, return a mock response
          if (error.status === 404) {
            console.warn(
              "Global search endpoint not available, returning mock data",
            );

            return new Observable((observer) => {
              observer.next({
                count: 0,
                totalMatches: 0,
                message: "Global search not implemented on backend",
              });
              observer.complete();
            });
          }

          return this.handleError(error);
        }),
      );
  }

  // Get global search count for a keyword
  getGlobalSearchCount(
    keyword: string,
    jiraProjectKey?: string,
    sprintId?: string,
  ): Observable<{ count: number; keyword: string }> {
    const request: any = {
      keyword,
      jiraProjectKey: jiraProjectKey || "",
    };
    if (sprintId) {
      request.sprintId = sprintId;
    }

    return this.http
      .post<{
        count: number;
        keyword: string;
      }>(
        `${this.baseUrl}/manual-page/global-keyword-search`,
        request,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  getSprintStatistics(sprintId: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/manual-page/sprints/${sprintId}/statistics`)
      .pipe(catchError(this.handleError));
  }

  getManualPageProjects(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/manual-page/projects`)
      .pipe(catchError(this.handleError));
  }

  // NEW: Get domains for filtering
  getManualPageDomains(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/manual-page/domains`)
      .pipe(catchError(this.handleError));
  }

  getManualPageTesters(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/manual-page/testers`)
      .pipe(catchError(this.handleError));
  }

  testJiraConnection(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/manual-page/test-connection`)
      .pipe(catchError(this.handleError));
  }

  // Test Case management (separate from main test cases)
  getAllTestCases(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/test-cases`)
      .pipe(catchError(this.handleError));
  }

  // Get test case by ID for refreshing data
  getManualPageTestCaseById(testCaseId: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/manual-page/test-cases/${testCaseId}`)
      .pipe(catchError(this.handleError));
  }

  // Jenkins integration
  triggerJenkinsJob(jobName: string, parameters?: any): Observable<any> {
    const body = parameters || {};

    return this.http
      .post<any>(
        `${this.baseUrl}/jenkins/trigger/${jobName}`,
        body,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  getJenkinsJobStatus(jobName: string, buildNumber: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/jenkins/status/${jobName}/${buildNumber}`)
      .pipe(catchError(this.handleError));
  }

  getJenkinsJobs(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/jenkins/jobs`)
      .pipe(catchError(this.handleError));
  }

  // QTest integration
  getQTestProjects(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/qtest/projects`)
      .pipe(catchError(this.handleError));
  }

  getQTestTestCases(projectId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}/qtest/projects/${projectId}/test-cases`)
      .pipe(catchError(this.handleError));
  }

  syncQTestTestCases(projectId: string): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/qtest/projects/${projectId}/sync`,
        {},
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // File upload
  uploadFile(file: File, type: string): Observable<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    return this.http
      .post<any>(`${this.baseUrl}/files/upload`, formData)
      .pipe(catchError(this.handleError));
  }

  // Reports
  generateReport(reportType: string, filters?: any): Observable<Blob> {
    const params = new HttpParams().set("type", reportType);

    return this.http
      .post(`${this.baseUrl}/reports/generate`, filters || {}, {
        params,
        responseType: "blob",
      })
      .pipe(catchError(this.handleError));
  }

  // Configuration
  getConfiguration(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/config`)
      .pipe(catchError(this.handleError));
  }

  updateConfiguration(config: any): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/config`, config, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // Health check
  healthCheck(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  // Jenkins job testers assignment and notes
  // ENHANCEMENT: Alternative method using the individual testers endpoint
  assignTestersToJenkinsResult(
    resultId: number,
    automationTesterId: number | null,
    manualTesterId: number | null,
  ): Observable<any> {
    const body = { automationTesterId, manualTesterId };

    return this.http
      .post<any>(
        `${this.baseUrl}/jenkins/results/${resultId}/testers`,
        body,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // ENHANCEMENT: Enhanced notes update method with proper request format
  updateJenkinsJobNotes(
    resultId: number,
    notes: { bugsIdentified?: string; failureReasons?: string; notes?: string },
  ): Observable<any> {
    // Send the notes in the format expected by the backend
    const requestBody = {
      bugsIdentified: notes.bugsIdentified || notes.notes || "",
      failureReasons: notes.failureReasons || notes.notes || "",
      notes: notes.notes || notes.bugsIdentified || "",
    };

    return this.http
      .put<any>(
        `${this.baseUrl}/jenkins/results/${resultId}/notes`,
        requestBody,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  // ENHANCEMENT: Combined save method for notes and testers
  saveJenkinsJobData(
    resultId: number,
    data: {
      notes?: string;
      automationTesterId?: number | null;
      manualTesterId?: number | null;
      projectId?: number | null;
    },
  ): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/jenkins/results/${resultId}/save-all`,
        data,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Enhanced error handler with better user messages
   */
  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = "An unknown error occurred!";

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage =
            "Cannot connect to server. Please ensure the backend is running on the correct port.";
          break;
        case 404:
          errorMessage =
            "API endpoint not found. Please check the server configuration.";
          break;
        case 500:
          errorMessage = "Internal server error. Please check the server logs.";
          break;
        case 503:
          errorMessage =
            "Service temporarily unavailable. Please try again later.";
          break;
        default:
          errorMessage =
            error.error?.message ||
            `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error("API Error Details:", {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: errorMessage,
      error: error.error,
    });

    return throwError(() => errorMessage);
  };

  createFeedback(feedbackDto: FeedbackRequest): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.baseUrl}/feedback`, feedbackDto);
  }

  getAllFeedback(testerId: number): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.baseUrl}/feedback/${testerId}`);
  }

  deleteFeedback(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/feedback/${id}`);
  }
}
