import { Inject, Injectable } from "@angular/core";
import { OKTA_AUTH } from "@okta/okta-angular";
import OktaAuth from "@okta/okta-auth-js";
@Injectable({ providedIn: "root" })
export class UserService {
  constructor(@Inject(OKTA_AUTH) private readonly oktaAuth: OktaAuth) {}

  public logout(): void {
    this.oktaAuth.signOut();
  }
}
