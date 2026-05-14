import { CustomEditor, getSettingsListTheme, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Container, SettingsList, truncateToWidth, visibleWidth, type SettingItem } from "@mariozechner/pi-tui";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { registerDeleteProtection } from "./delete-protection";
import { registerEditProtection } from "./edit-protection";
import { registerGitProtection } from "./git-protection";
import { registerPrivilegeProtection } from "./privilege-protection";
import { registerUserMessageRenderer } from "./user-message-renderer";
import { registerToolOutputRenderer } from "./tool-output-renderer";
import { state } from "./constants";
import { osNotify } from "./os-notify";

type ShieldConfig = {
  defaultEnabled: boolean;
  notificationEnabled: boolean;
};

const CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-shield.json");
const DEFAULT_CONFIG: ShieldConfig = { defaultEnabled: true, notificationEnabled: true };

// ANSI colors
const RESET = "\x1b[0m";
function rgbFg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Shield gradient: richer but restrained blue tones
const SHIELD_COLORS = [
  [30, 58, 138],    // blue-900
  [30, 64, 175],    // blue-800
  [29, 78, 216],    // blue-700
  [37, 99, 235],    // blue-600
  [59, 130, 246],   // blue-500
  [96, 165, 250],   // blue-400
  [59, 130, 246],   // blue-500
  [37, 99, 235],    // blue-600
  [29, 78, 216],    // blue-700
  [30, 64, 175],    // blue-800
];

// Fire gradient: richer but restrained red tones
const FIRE_COLORS = [
  [127, 29, 29],    // red-900
  [153, 27, 27],    // red-800
  [185, 28, 28],    // red-700
  [220, 38, 38],    // red-600
  [239, 68, 68],    // red-500
  [248, 113, 113],  // red-400
  [239, 68, 68],    // red-500
  [220, 38, 38],    // red-600
  [185, 28, 28],    // red-700
  [153, 27, 27],    // red-800
];

function loadConfig(): ShieldConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<ShieldConfig>;
    return {
      defaultEnabled: parsed.defaultEnabled ?? DEFAULT_CONFIG.defaultEnabled,
      notificationEnabled: parsed.notificationEnabled ?? DEFAULT_CONFIG.notificationEnabled,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: ShieldConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function setShieldEnabled(enabled: boolean): void {
  state.protectionEnabled = enabled;
  activeProtectionEditor?.refresh();
}

function setNotificationEnabled(enabled: boolean): void {
  state.notificationEnabled = enabled;
}

function renderStatusLabel(frame: number): string {
  const colors = state.protectionEnabled ? SHIELD_COLORS : FIRE_COLORS;
  const text = state.protectionEnabled ? "[ 🛡   shield on  ]" : "[ 🛡💥 shield off ]";
  const color = colors[frame % colors.length];
  return `${rgbFg(color[0], color[1], color[2])}${text}${RESET}`;
}

let activeProtectionEditor: ProtectionEditor | undefined;

class ProtectionEditor extends CustomEditor {
  private animationTimer?: ReturnType<typeof setInterval>;
  private frame = 0;

  constructor(...args: any[]) {
    super(...args);
    this.animationTimer = setInterval(() => {
      this.frame++;
      this.tui.requestRender();
    }, 800);
  }

  refresh(): void {
    this.tui.requestRender();
  }

  dispose(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length === 0) return lines;

    const CYAN = "\x1b[38;2;34;211;238m";
    const R    = "\x1b[0m";

    const label      = ` ${renderStatusLabel(this.frame)} `;
    const labelWidth = visibleWidth(label);

    const stripAnsi = (s: string) => s.replace(/\x1b\[[^m]*m/g, "");

    // Label position: starts at col 6, gets pushed right by input text
    const firstLine  = this.getText().split("\n")[0] ?? "";
    const textW      = visibleWidth(firstLine);
    const defaultPos = 6;
    const labelPos   = Math.min(width - labelWidth, Math.max(defaultPos, textW + 1));

    // Top border: cyan dashes, label at labelPos, cyan dashes to end
    const borderChar = "─";
    const topBorder  =
      `${CYAN}${borderChar.repeat(labelPos)}${R}` +
      label +
      `${CYAN}${borderChar.repeat(Math.max(0, width - labelPos - labelWidth))}${R}`;
    lines[0] = topBorder;

    // Bottom border: cyan
    const last = lines.length - 1;
    lines[last] = `${CYAN}${stripAnsi(lines[last]!)}${R}`;

    return lines;
  }
}

function installProtectionEditor(ctx: { ui: { setEditorComponent: (factory: unknown) => void; setWidget: (key: string, lines?: string[]) => void } }) {
  ctx.ui.setWidget("protection", undefined);
  ctx.ui.setEditorComponent((tui: unknown, theme: unknown, keybindings: unknown) => {
    activeProtectionEditor?.dispose();
    activeProtectionEditor = new ProtectionEditor(tui, theme, keybindings);
    return activeProtectionEditor;
  });
}

async function openShieldPanel(ctx: any): Promise<void> {
  await ctx.ui.custom((tui: any, theme: any, _keybindings: any, done: (value?: unknown) => void) => {
    const config = loadConfig();
    const items: SettingItem[] = [
      {
        id: "current",
        label: "session shield",
        currentValue: state.protectionEnabled ? "on" : "off",
        values: ["on", "off"],
      },
      {
        id: "default",
        label: "default shield",
        currentValue: config.defaultEnabled ? "on" : "off",
        values: ["on", "off"],
      },
      {
        id: "notifications",
        label: "notifications",
        currentValue: state.notificationEnabled ? "on" : "off",
        values: ["on", "off"],
      },
    ];

    const container = new Container();
    container.addChild(
      new (class {
        render(_width: number) {
          return [theme.fg("accent", theme.bold("🛡 Pi Shield")), ""];
        }
        invalidate() {}
      })(),
    );

    const settingsList = new SettingsList(
      items,
      5,
      getSettingsListTheme(),
      (id, newValue) => {
        const enabled = newValue === "on";
        if (id === "current") {
          setShieldEnabled(enabled);
        } else if (id === "default") {
          saveConfig({ ...loadConfig(), defaultEnabled: enabled });
        } else if (id === "notifications") {
          setNotificationEnabled(enabled);
          saveConfig({ ...loadConfig(), notificationEnabled: enabled });
        }
      },
      () => done(undefined),
    );

    container.addChild(settingsList);

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        settingsList.handleInput?.(data);
        tui.requestRender();
      },
    };
  });
}

export default function (pi: ExtensionAPI) {

  registerDeleteProtection(pi);
  registerEditProtection(pi);
  registerGitProtection(pi);
  registerPrivilegeProtection(pi);
  registerUserMessageRenderer(pi);
  registerToolOutputRenderer(pi);

  pi.on("session_start", async (_event, ctx) => {
    const config = loadConfig();
    state.protectionEnabled = config.defaultEnabled;
    state.notificationEnabled = config.notificationEnabled;
    installProtectionEditor(ctx);
  });

  pi.on("session_shutdown", async () => {
    activeProtectionEditor?.dispose();
    activeProtectionEditor = undefined;
  });

  pi.registerShortcut("ctrl+shift+s", {
    description: "Toggle shield for current session",
    handler: async (ctx) => {
      setShieldEnabled(!state.protectionEnabled);
      ctx.ui.notify(`Shield ${state.protectionEnabled ? "enabled" : "disabled"} for current session`, "info");
    },
  });

  pi.registerCommand("shield", {
    description: "Toggle file protection shield on/off",
    getArgumentCompletions(prefix: string) {
      return [
        { value: "on", label: "on - Enable shield for current session" },
        { value: "off", label: "off - Disable shield for current session" },
        { value: "default on", label: "default on - Enable shield by default" },
        { value: "default off", label: "default off - Disable shield by default" },
        { value: "notifications on", label: "notifications on - Enable OS notifications" },
        { value: "notifications off", label: "notifications off - Disable OS notifications" },
      ].filter((i) => i.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      const normalized = args.trim().toLowerCase();
      const parts = normalized.split(/\s+/).filter(Boolean);

      if (parts.length === 0) {
        await openShieldPanel(ctx);
      } else if (normalized === "on") {
        setShieldEnabled(true);
        ctx.ui.notify("🛡️ Shield enabled", "info");
      } else if (normalized === "off") {
        setShieldEnabled(false);
        ctx.ui.notify("⚠️ Shield disabled", "info");
      } else if (normalized === "default on") {
        saveConfig({ ...loadConfig(), defaultEnabled: true });
        ctx.ui.notify("🛡️ Default shield is now on", "info");
      } else if (normalized === "default off") {
        saveConfig({ ...loadConfig(), defaultEnabled: false });
        ctx.ui.notify("⚠️ Default shield is now off", "info");
      } else if (normalized === "notifications on") {
        setNotificationEnabled(true);
        saveConfig({ ...loadConfig(), notificationEnabled: true });
        ctx.ui.notify("🔔 Notifications enabled", "info");
      } else if (normalized === "notifications off") {
        setNotificationEnabled(false);
        saveConfig({ ...loadConfig(), notificationEnabled: false });
        ctx.ui.notify("🔕 Notifications disabled", "info");
      } else {
        const config = loadConfig();
        const currentStatus = state.protectionEnabled ? "🛡️ on" : "⚠️ off";
        const defaultStatus = config.defaultEnabled ? "🛡️ on" : "⚠️ off";
        const notificationStatus = state.notificationEnabled ? "🔔 on" : "🔕 off";
        ctx.ui.notify(`Current: ${currentStatus}. Default: ${defaultStatus}. Notifications: ${notificationStatus}. Usage: /shield, /shield on|off, /shield default on|off, /shield notifications on|off`, "info");
      }
    },
  });

  pi.on("agent_end", async (event, _ctx) => {
    const MAX_LENGTH = 100;
    let summary = "";

    // Find the last assistant message
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const msg = event.messages[i];
      if (msg.role === "assistant" && msg.content) {
        for (const block of Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }]) {
          if (block.type === "text" && block.text) {
            summary = block.text;
            break;
          }
        }
        if (summary) break;
      }
    }

    if (summary.length > MAX_LENGTH) {
      summary = summary.slice(0, MAX_LENGTH) + "…";
    }

    osNotify("π", summary || "⚠️ No response text");
  });

}
