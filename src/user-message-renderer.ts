import {
  getMarkdownTheme,
  UserMessageComponent,
  type ExtensionAPI,
  type ThemeColor,
} from "@mariozechner/pi-coding-agent";
import { Markdown, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ThemeLike = {
  fg(color: ThemeColor, text: string): string;
  bold(text: string): string;
  italic(text: string): string;
  dim?(text: string): string;
};

type PatchedProto = {
  render: (this: PatchedProto, width: number) => string[];
  __origRender?: (this: PatchedProto, width: number) => string[];
  __patched?: boolean;
  __getTheme?: () => ThemeLike | undefined;
  children?: unknown[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function findMarkdownText(node: unknown): string | undefined {
  if (isRecord(node) && typeof node.text === "string") return node.text;
  if (!isRecord(node)) return undefined;
  for (const child of Array.isArray(node.children) ? node.children : []) {
    const result = findMarkdownText(child);
    if (result !== undefined) return result;
  }
  return undefined;
}

// ─── Render ────────────────────────────────────────────────────────────────────

function renderStyledMessage(
  instance: PatchedProto,
  width: number,
  theme: ThemeLike | undefined,
): string[] | undefined {
  const text = findMarkdownText(instance);
  if (text === undefined) return undefined;

  const indent = "  ";
  const indentW = 2;
  const bodyWidth = Math.max(1, width - indentW);

  // Render markdown — inject color + italic directly so ANSI resets don't clobber it
  const md = new Markdown(text, 0, 0, getMarkdownTheme(), {
    color: (t: string) => theme ? theme.fg("userMessageText", t) : t,
    italic: true,
  });
  const mdLines = md.render(bodyWidth);
  const body = mdLines.length > 0 ? mdLines : [""];

  const corner = (s: string) =>
    theme ? theme.fg("accent", theme.bold(s)) : s;

  // Content lines: indented (color + italic already baked in by Markdown)
  const contentLines = body.map((line) => {
    const clipped = truncateToWidth(line, bodyWidth, "");
    return `${indent}${clipped}`;
  });

  // ╯ aligned to content end, with a short leading dash
  const maxContentW = Math.max(...body.map((l) => {
    const plain = l.replace(/\x1b\[[^m]*m/g, "").trimEnd();
    return visibleWidth(plain);
  }));
  // closing: "   ─╯"  (pad to content end, then ─╯)
  const closingCol = Math.min(indentW + maxContentW + 3, width - 2);
  const closingPad = " ".repeat(Math.max(0, closingCol));
  const closing = `${closingPad}${corner("─╯")}`;

  return [
    "",
    corner("╭─"),
    ...contentLines,
    closing,
  ];
}

// ─── Prototype patch ───────────────────────────────────────────────────────────

function applyPatch(getTheme: () => ThemeLike | undefined): void {
  const proto = UserMessageComponent.prototype as unknown as PatchedProto;
  proto.__getTheme = getTheme;
  if (proto.__patched) return;
  proto.__patched = true;
  proto.__origRender = proto.render;
  proto.render = function (this: PatchedProto, width: number): string[] {
    const theme = (UserMessageComponent.prototype as unknown as PatchedProto).__getTheme?.();
    const styled = renderStyledMessage(this, width, theme);
    const orig = (UserMessageComponent.prototype as unknown as PatchedProto).__origRender!;
    return styled ?? orig.call(this, width);
  };
}

// ─── Registration ──────────────────────────────────────────────────────────────

export function registerUserMessageRenderer(pi: ExtensionAPI): void {
  let activeTheme: ThemeLike | undefined;
  const getTheme = () => activeTheme;
  applyPatch(getTheme);
  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;
    activeTheme = ctx.ui.theme as unknown as ThemeLike;
    applyPatch(getTheme);
  });
}
