import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AppService } from "./services/app.service";
import { map } from "rxjs/operators";

export const authGuard: CanActivateFn = () => {
  const appService = inject(AppService);
  const router = inject(Router);

  return appService.isAuthorised$.pipe(
    map((isAuth) => {
      if (isAuth) {
        return true;
      } else {
        return router.createUrlTree(["/unauthorized"]);
      }
    }),
  );
};
