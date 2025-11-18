import { Injectable } from "@angular/core";
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { catchError, finalize, Observable, throwError } from "rxjs";
import { AppService } from "./services/app.service"; // Adjust the path as needed
import { environment } from "../environments/environment";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private appService: AppService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const excludedUrls = ["api/jenkins/sync"];

    const shouldSkipLoader = excludedUrls.some((url) => req.url.includes(url));
    if (!shouldSkipLoader) {
      this.appService.showLoader();
    }
    const authReq = req.clone({
      setHeaders: {
        client_id: environment.clientId,
        client_secret: environment.clientSecret,
      },
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
      finalize(() => {
        // Hide loader when request completes (success or error)
        this.appService.hideLoader();
      }),
    );
  }
}
