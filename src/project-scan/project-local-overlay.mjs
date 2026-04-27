import fs from "node:fs";
import { ensureDir } from "../shared/fs.mjs";

export function ensureProjectScanOverlayRoot(paths) {
  ensureDir(paths.overlayRoot);
  if (!fs.existsSync(paths.overlayReadmePath)) {
    fs.writeFileSync(paths.overlayReadmePath, "# Project Local Skill\n", "utf8");
  }
}
