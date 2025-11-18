import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, Inject } from "@angular/core";
import { OktaAuthStateService, OKTA_AUTH } from "@okta/okta-angular";
import OktaAuth, { UserClaims } from "@okta/okta-auth-js";
import {
  Observable,
  shareReplay,
  map,
  share,
  filter,
  switchMap,
  from,
  throwError,
  catchError,
  BehaviorSubject,
} from "rxjs";
import { environment } from "../../environments/environment";

import { CustomUserClaims } from "@okta/okta-auth-js";
import { WinResponse } from "../models/win-response";

export interface AccessPermissions {
  username: string;
  resource: string;
  globalResourcePermissions: string[];
  companyResourcePermissions: string[];
}

export interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  company: string;
  winId: string;
  winOrg: string;
  winFunction: string;
  winPosition: string;
  winDirector: string;
  wiseProfileId: string;
}

export interface PageAccessStatus {
  isAccessAllowed: boolean;
  redirectToUrl: string;
}

export interface AuthUserClaims extends CustomUserClaims {
  winUser: string;
}

@Injectable({
  providedIn: "root",
})
export class UserResourcePermissionsService {
  private redirectToUrl = "/dashboard";
  private permissions$: Observable<string[]>;

  private _hasReadPermission = new BehaviorSubject<boolean>(false);
  private _hasWritePermission = new BehaviorSubject<boolean>(false);
  private _hasAdminPermission = new BehaviorSubject<boolean>(false);

  // Public observables to expose to components
  readonly hasReadPermission$ = this._hasReadPermission.asObservable();
  readonly hasWritePermission$ = this._hasWritePermission.asObservable();
  readonly hasAdminPermission$ = this._hasAdminPermission.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly authStateService: OktaAuthStateService,
    @Inject(OKTA_AUTH) private readonly oktaAuth: OktaAuth
  ) {
    this.permissions$ = this.fetchUserResourcePermissions().pipe(
      shareReplay(1)
    );
  }

  getPermissions(): Observable<string[]> {
    return this.permissions$;
  }

  isPageAccessible(url: string): Observable<PageAccessStatus> {
    return this.permissions$.pipe(
      map((perms: string[]) => {
        const hasAdmin = perms.includes(environment.appAdmin);
        const hasWrite = perms.includes(environment.appWrite);
        const hasRead = perms.includes(environment.appRead);

        // Update internal BehaviorSubjects
        this._hasAdminPermission.next(hasAdmin);
        this._hasWritePermission.next(hasWrite);
        this._hasReadPermission.next(hasRead);

        const hasAnyPermission = hasAdmin || hasWrite || hasRead;

        return {
          isAccessAllowed: hasAnyPermission,
          redirectToUrl: "/unauthorized",
        };
      })
    );
  }

  private fetchUserResourcePermissions(): Observable<string[]> {
    const url = environment.amsHelperUrl;
    return this.authStateService.authState$.pipe(
      filter((authState) => !!(authState && authState.isAuthenticated)),
      switchMap(() =>
        from(this.oktaAuth.getUser() as Promise<UserClaims<AuthUserClaims>>)
      ),
      switchMap(({ winUser = "" }) => {
        if (!winUser) {
          const errorMessage =
            'Critical: "winUser" not found in Okta user claims. Cannot fetch permissions.';
          console.error(errorMessage);
          return throwError(() => new Error(errorMessage));
        }
        return this.http
          .get<
            WinResponse<AccessPermissions>
          >(`${url}/automation-dashboard/users/${winUser}`)
          .pipe(
            map((response) => response.data?.globalResourcePermissions as any),
            catchError((error: HttpErrorResponse) => {
              const errorMessage =
                "Failed to fetch user permissions from backend:";
              console.error(errorMessage, error);
              return throwError(
                () => new Error(`${errorMessage} ${error.message}`)
              );
            })
          );
      }),
      catchError((error) => {
        const errorMessage =
          "Authentication error or Okta user claims retrieval failed:";
        console.error(errorMessage, error);
        return throwError(() => new Error(`${errorMessage} ${error.message}`));
      })
    );
  }
}
