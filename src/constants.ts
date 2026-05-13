// Universal confirmation message for all protection modules
export const CONFIRM_MESSAGE = "🤖 Please confirm:";

// Protection state (session-scoped, resets on reload/new session)
export let protectionEnabled = true;

export function setProtectionEnabled(value: boolean) {
  protectionEnabled = value;
}
