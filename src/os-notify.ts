import { execSync } from "node:child_process";

export function osNotify(title: string, message: string) {
  try {
    execSync(`osascript -e 'display notification "${escape(message)}" with title "${escape(title)}" sound name "default"'`);
  } catch {
    // 静默失败，不影响主流程
  }
}

function escape(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
