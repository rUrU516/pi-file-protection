import {
  getMarkdownTheme,
  UserMessageComponent,
  type ExtensionAPI,
  type ThemeColor,
} from "@mariozechner/pi-coding-agent";
import { Markdown, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

type ThemeLike = {
  fg(color: ThemeColor, text: string): string;
  bold(text: string): string;
  italic(text: string): string;
};

type PatchedProto = {
  render: (this: PatchedProto, width: number) => string[];
  __origRender?: (this: PatchedProto, width: number) => string[];
  __patched?: boolean;
  __getTheme?: () => ThemeLike | undefined;
  children?: unknown[];
};

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

function renderStyledMessage(
  instance: PatchedProto,
  width: number,
  theme: ThemeLike | undefined,
): string[] | undefined {
  const text = findMarkdownText(instance);
  if (text === undefined) return undefined;

  // Bold colored vertical bar — amp-themes style
  const bar = theme ? theme.fg("accent", theme.bold("▌")) : "▌";
  const barW = visibleWidth(bar);
  const contentWidth = Math.max(1, width - barW);

  const md = new Markdown(text, 0, 0, getMarkdownTheme(), {
    color: (t: string) => theme ? theme.fg("userMessageText", t) : t,
    italic: true,
  });
  const mdLines = md.render(contentWidth);
  const body = mdLines.length > 0 ? mdLines : [""];

  return [
    "",
    ...body.map((line) => {
      const clipped = truncateToWidth(line, contentWidth, "");
      const pad = " ".repeat(Math.max(0, contentWidth - visibleWidth(clipped)));
      return `${bar}${clipped}${pad}`;
    }),
  ];
}

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
