import { execSync } from "node:child_process";

const MAX_LENGTH = 100;

export function osNotify(title: string, message: string) {
  try {
    const truncated = message.length > MAX_LENGTH ? message.slice(0, MAX_LENGTH) + "…" : message;
    execSync(`osascript -e 'display notification "${escape(truncated)}" with title "${escape(title)}" sound name "default"'`);
  } catch {
    // 静默失败，不影响主流程
  }
}

function escape(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}
