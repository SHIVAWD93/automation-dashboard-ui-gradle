import { Router } from "@angular/router";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { OktaAuth } from "@okta/okta-auth-js";
import { APP_INITIALIZER, importProvidersFrom, inject } from "@angular/core";
import { AppComponent } from "./app/app.component";
import { DialogModule } from "primeng/dialog";
import { CardModule } from "primeng/card";
import { ButtonModule } from "primeng/button";
import { DropdownModule } from "primeng/dropdown";
import { AppRoutingModule } from "./app/app-routing.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { provideAnimations } from "@angular/platform-browser/animations";
import { BrowserModule, bootstrapApplication } from "@angular/platform-browser";
import { AuthInterceptor } from "./app/auth.interceptor";
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient,
  HttpInterceptorFn,
  withInterceptors,
} from "@angular/common/http";
import { ApiService } from "./app/services/api.service";
import { AppService } from "./app/services/app.service";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import {
  OKTA_AUTH,
  OktaAuthModule,
  OktaAuthStateService,
  OktaConfig,
} from "@okta/okta-angular";
import { environment } from "./environments/environment";
import { concatMap, defer, EMPTY, filter, finalize, take } from "rxjs";
import { UserService } from "./app/services/user-service.service";

export const oktaAuthInterceptor: HttpInterceptorFn = (
  req,
  next,
  oktaAuth = inject(OKTA_AUTH),
) => {
  const accessToken = oktaAuth.getAccessToken();
  if (accessToken) {
    const injectedHeaders = {
      authorization: "Bearer " + accessToken,
    };

    return next(
      req.clone({
        setHeaders: injectedHeaders,
      }),
    );
  }

  return next(req);
};

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      FormsModule,
      ReactiveFormsModule,
      AppRoutingModule,
      DropdownModule,
      ButtonModule,
      CardModule,
      DialogModule,
      ToastModule,
      OktaAuthModule.forRoot({
        oktaAuth: new OktaAuth(environment.OktaAuth),
      }),
    ),
    ApiService,
    UserService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptors([oktaAuthInterceptor])),
    MessageService,
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
  ],
}).catch((err) => console.error(err));
