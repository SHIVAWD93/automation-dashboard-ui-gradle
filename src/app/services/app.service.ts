import { Injectable } from "@angular/core";
import { BehaviorSubject, combineLatest, firstValueFrom } from "rxjs";
import { MessageService } from "primeng/api";
import { ToastMessage } from "../models/utils";
import { UserResourcePermissionsService } from "./user-resource-permissions.service";

@Injectable({
  providedIn: "root",
})
export class AppService {
  // Observables to expose to components
  readonly isAuthorised$ = new BehaviorSubject<boolean>(false);
  readonly authenticated$ = this.isAuthorised$; // alias for clarity
  hasReadPermission: boolean = false;
  hasWritePermission: boolean = false;
  hasAdminPermission: boolean = false;

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private userResourcePermissionService: UserResourcePermissionsService,
    private messageService: MessageService
  ) {
    this.subscribeToPermissions();
  }

  subscribeToPermissions(): void {
    combineLatest([
      this.userResourcePermissionService.hasReadPermission$,
      this.userResourcePermissionService.hasWritePermission$,
      this.userResourcePermissionService.hasAdminPermission$,
    ]).subscribe(([read, write, admin]) => {
      this.hasReadPermission = read;
      this.hasWritePermission = write;
      this.hasAdminPermission = admin;
      const isAuthorised = read || write || admin;
      this.isAuthorised$.next(isAuthorised);
    });
  }
  showToast(toastMessage: ToastMessage): void {
    this.messageService.add({
      severity: toastMessage.severity,
      summary: toastMessage.summary,
      detail: toastMessage.detail,
    });
  }

  showLoader() {
    this.loadingSubject.next(true);
  }

  hideLoader() {
    this.loadingSubject.next(false);
  }
}
