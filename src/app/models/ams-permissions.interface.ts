export interface AmsPermissions {
  username: string;
  resource: string;
  globalResourcePermissions: string[];
  companyResourcePermissions: CompanyResourcePermissions[];
}

export interface CompanyResourcePermissions {
  companyNumber: string;
  permissions: string[];
}
