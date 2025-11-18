import { UserService } from "./services/user-service.service";
import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { ToastModule } from "primeng/toast";
import { Button } from "primeng/button";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { AppService } from "./services/app.service";
import { AsyncPipe, CommonModule } from "@angular/common";
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ToastModule,
    Button,
    ProgressSpinnerModule,
    AsyncPipe,
    CommonModule,
  ],
})
export class AppComponent {
  title = "QA Automation Coverage Dashboard";

  constructor(
    private userService: UserService,
    private appService: AppService,
  ) {}
  loading$ = this.appService.loading$;

  logout(): void {
    this.userService.logout();
  }
}
