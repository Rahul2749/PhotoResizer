import type { FileKind } from "./workflow";
import type { PresetRule } from "./presets";

export type ToolSetup = { kind: FileKind; rule: PresetRule; label: string };
