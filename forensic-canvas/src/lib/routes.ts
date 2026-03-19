export const appRoutes = {
  login: "/",
  signup: "/signup",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  createCase: "/create-case",
  workspace: "/workspace",
} as const;

export function workspacePath(caseId: string): string {
  return `${appRoutes.workspace}?case_id=${encodeURIComponent(caseId)}`;
}