import { Injectable } from "@angular/core";
import { UserPermission } from "../models/user-permission.modal";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { BehaviorSubject } from "rxjs";

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

  getAllPermissions(): any {
    return this.httpClient.get(environment.apiUrl.concat("/permissions"));
  }

  getUserInfo(userName: string, password: string): any {
    let params = new HttpParams()
      .set("userName", userName)
      .set("password", password);

    return this.httpClient.get(environment.apiUrl.concat("/user"), {
      params: params,
    });
  }

  registerUser(user: any): any {
    return this.httpClient.post(environment.apiUrl.concat("/user"), user);
  }
}
