const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function cooldownKey(type: string) {
  return `fts-notif-last-${type}`;
}

function isCooledDown(type: string): boolean {
  const raw = localStorage.getItem(cooldownKey(type));
  if (!raw) return true;
  return Date.now() - parseInt(raw, 10) > COOLDOWN_MS;
}

function markSent(type: string) {
  localStorage.setItem(cooldownKey(type), String(Date.now()));
}

export function sendFintrackNotification(title: string, body: string, type: string): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!isCooledDown(type)) return;

  new Notification(title, {
    body,
    tag: `fintrack-${type}`,
    icon: "/favicon.ico",
  });
  markSent(type);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
