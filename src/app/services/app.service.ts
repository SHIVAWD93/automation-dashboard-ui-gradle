import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppService {
  userPermission: string | undefined;
  isAuthorised: boolean = false;
  token:string = '';
  authenticated = new BehaviorSubject(false);
  constructor(private httpClient: HttpClient) {
  }

  getAllPermissions(): Observable<unknown> {
    return this.httpClient.get(environment.apiUrl.concat("/permissions"));
  }

  getUserInfo(userName: string, password: string): Observable<{ permission: string; token: string }> {
    let params = new HttpParams()
      .set("userName", userName)
      .set("password", password);

    return this.httpClient.get<{ permission: string; token: string }>(environment.apiUrl.concat("/user"), {
      params: params,
    });
  }

  registerUser<T extends Record<string, unknown>>(user: T): Observable<unknown> {
    return this.httpClient.post(environment.apiUrl.concat("/user"), user);
  }
}
