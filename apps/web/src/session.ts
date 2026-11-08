// Who is using the site. There is no real sign-in yet (Google and Microsoft come next), so we remember the email the
// student paid with, in this browser only. localStorage can be blocked, so every call is wrapped.
const EMAIL_KEY = "workterm.email";
const ADMIN_KEY = "workterm.admin";

export function getSessionEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSessionEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Blocked storage: the dashboard just asks for the email again.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Nothing to clear.
  }
}

// The admin key lives in this tab only (sessionStorage), so closing the tab signs the admin out.
export function getAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAdminKey(key: string): void {
  try {
    if (key) sessionStorage.setItem(ADMIN_KEY, key);
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // Blocked storage: the admin types the key again on reload.
  }
}
