import { ToolExecutionComponent } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI, ThemeColor } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

const R          = "\x1b[0m";
const BOLD       = "\x1b[1m";
const DIM        = "\x1b[2m";
const GREEN_DIM  = "\x1b[38;2;60;140;60m";   // 执行中：暗绿
const GREEN_BRIGHT = "\x1b[38;2;80;220;100m"; // 完成：亮绿

type ThemeLike = {
  fg(color: ThemeColor, text: string): string;
  bold(text: string): string;
};

type PatchedProto = {
  render: (this: PatchedProto, width: number) => string[];
  __origRender?: (this: PatchedProto, width: number) => string[];
  __toolPatched?: boolean;
  __getTheme?: () => ThemeLike | undefined;
  isPartial?: boolean;
  result?: { isError?: boolean };
};

function stripBg(line: string): string {
  return line
    .replace(/\x1b\[48;[^m]+m/g, "")
    .replace(/\x1b\[4[0-9]m/g, "")
    .replace(/\x1b\[10[0-7]m/g, "");
}

function applyToolPatch(getTheme: () => ThemeLike | undefined): void {
  const proto = ToolExecutionComponent.prototype as unknown as PatchedProto;
  proto.__getTheme = getTheme;
  if (proto.__toolPatched) return;
  proto.__toolPatched = true;
  proto.__origRender = proto.render;

  proto.render = function (this: PatchedProto, width: number): string[] {
    const lines = (ToolExecutionComponent.prototype as unknown as PatchedProto).__origRender!.call(this, width);
    const theme = (ToolExecutionComponent.prototype as unknown as PatchedProto).__getTheme?.();

    const bar = this.isPartial
      ? `${DIM}${GREEN_DIM}${BOLD}▌${R}`
      : this.result?.isError
        ? (theme ? theme.fg("error", theme.bold("▌")) : `${BOLD}▌${R}`)
        : `${GREEN_BRIGHT}${BOLD}▌${R}`;

    return lines.map((line) =>
      `${bar}${truncateToWidth(stripBg(line), width - 1, "")}`
    );
  };
}

export function registerToolOutputRenderer(pi: ExtensionAPI): void {
  let activeTheme: ThemeLike | undefined;
  const getTheme = () => activeTheme;
  applyToolPatch(getTheme);
  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;
    activeTheme = ctx.ui.theme as unknown as ThemeLike;
    applyToolPatch(getTheme);
  });
}
