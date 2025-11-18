export const environment = {
  production: false,
  env: "dev",
  clientId: "437a45ea4dc94a62b50e016c71974082",
  clientSecret: "6c6Bf8120f9B476093138Ed354e26B59",
  clientUrl: "http://192.168.1.34:8000/automation-dashboard-service/api",
  amsHelperUrl:
    "https://k8sdev.winsupply.com/access-management-client-api/userResourcePermissions",
  appRead: "automation-dashboard.read",
  appWrite: "automation-dashboard.write",
  appAdmin: "automation-dashboard.admin",
  OktaAuth: {
    issuer: "https://login-dev.winsupply.com/oauth2/ausdqfp3m8o1jfPBF1d7",
    clientId: "0oaqrort470O48nVf1d7",
    redirectUri: "https://intraappsdev.winsupply.com/quality-assurance/automation-dashboard-ui/login/callback",
    postLogoutRedirectUri: "https://intraappsdev.winsupply.com/quality-assurance/automation-dashboard-ui/",
  },
};
