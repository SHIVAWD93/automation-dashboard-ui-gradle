import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  UrlTree,
} from "@angular/router";
import { Observable, map } from "rxjs";
import { UserResourcePermissionsService } from "./services/user-resource-permissions.service";

@Injectable({
  providedIn: "root",
})
export class AccessGuard implements CanActivate {
  constructor(
    private permissionsService: UserResourcePermissionsService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    console.log(route.routeConfig?.path)
    return this.permissionsService
      .isPageAccessible(route?.routeConfig?.path as any)
      .pipe(
        map(
          ({ isAccessAllowed, redirectToUrl }) =>
            isAccessAllowed || this.router.createUrlTree([redirectToUrl])
        )
      );
  }
}
