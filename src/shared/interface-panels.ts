import { z } from "zod";
export const panelModeSchema = z.enum(["always", "hover", "hidden"]);
export type PanelMode = z.infer<typeof panelModeSchema>;
export const interfacePanelsSchema = z.object({
  sidebar: panelModeSchema,
  navigation: panelModeSchema,
  chat: panelModeSchema,
  controls: panelModeSchema,
});
export type InterfacePanels = z.infer<typeof interfacePanelsSchema>;
export const defaultInterfacePanels: InterfacePanels = {
  sidebar: "always",
  navigation: "always",
  chat: "always",
  controls: "hover",
};
export function loadInterfacePanels(raw: string | null): InterfacePanels {
  try {
    return interfacePanelsSchema.parse(JSON.parse(raw ?? "null"));
  } catch {
    return { ...defaultInterfacePanels };
  }
}
