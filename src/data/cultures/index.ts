import type {
  CultureDefinition,
  CultureId,
  CuratedName,
  NameComponent,
} from "@/types/names";
import { arabicCulture } from "./arabic";
import { japaneseCulture } from "./japanese";
import { turkicCulture } from "./turkic";

export interface CultureRegistry {
  cultures: Readonly<Record<CultureId, CultureDefinition>>;
  componentById: ReadonlyMap<string, NameComponent>;
  nameById: ReadonlyMap<string, CuratedName>;
}

export function createRegistry(definitions: readonly CultureDefinition[]): CultureRegistry {
  const cultures = {} as Record<CultureId, CultureDefinition>;
  const componentById = new Map<string, NameComponent>();
  const nameById = new Map<string, CuratedName>();
  for (const def of definitions) {
    cultures[def.id] = def;
    for (const component of def.components) componentById.set(component.id, component);
    for (const name of def.names) nameById.set(name.id, name);
  }
  return { cultures, componentById, nameById };
}

export const defaultRegistry: CultureRegistry = createRegistry([
  turkicCulture,
  arabicCulture,
  japaneseCulture,
]);
