import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerDeleteProtection } from "./delete-protection";
import { registerEditProtection } from "./edit-protection";

export default function (pi: ExtensionAPI) {

  registerDeleteProtection(pi);
  registerEditProtection(pi);

}
