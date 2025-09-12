import { Injectable } from "@angular/core";
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { catchError, Observable, throwError } from "rxjs";
import { AppService } from "./services/app.service"; // Adjust the path as needed
import { SessionStorageService } from "./services/session-storage.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private appService: AppService,
    private sessionStorageService: SessionStorageService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.appService.token;
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(error);
        if (error.error.error) {
          this.sessionStorageService.removeAll();
          window.location.reload();
        }
        return throwError(() => error);
      })
    );
  }
}
