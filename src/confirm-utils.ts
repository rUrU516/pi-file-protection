import type { ExtensionContext, ToolCallEventResult } from "@mariozechner/pi-coding-agent";

const ALLOW_OPTION = "Allow";
const REFUSE_OPTION = "Refuse";
const REFUSE_WITH_REASON_OPTION = "Refuse with reason...";

/**
 * Shows a three-option confirmation dialog:
 *   ✅  Allow  |  🚫  Refuse  |  ✏️  Refuse with reason...
 *
 * Returns undefined to allow the operation, or { block: true, reason } to block it.
 * Selecting "Refuse with reason..." opens a follow-up text input for the custom reason.
 * Pressing Esc (undefined from select) is treated as Refuse (safe default).
 */
export async function confirmWithReason(
  ctx: ExtensionContext,
  title: string,
  message: string,
): Promise<ToolCallEventResult | undefined> {
  const choice = await ctx.ui.select(
    `${title}\n${message}`,
    [ALLOW_OPTION, REFUSE_OPTION, REFUSE_WITH_REASON_OPTION],
  );

  if (choice === ALLOW_OPTION) {
    return undefined; // allow
  }

  if (choice === REFUSE_WITH_REASON_OPTION) {
    const reason = await ctx.ui.input(
      "Why should this be blocked?",
      "Enter your reason (press Esc to skip)...",
    );
    return {
      block: true,
      reason: reason?.trim() || "Refused by the user.",
    };
  }

  // REFUSE_OPTION or Esc (undefined) → block with default reason
  return { block: true, reason: "Refused by the user." };
}
