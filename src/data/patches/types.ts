// Types utilitaires et schémas de patchs (uniquement types)

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Patches pour les Unités (structure UnifiedUnit/UnifiedVariation)
export interface UnitVariationMatch {
  id?: string;
  age?: number;
  civsIncludes?: string; // ex: 'de'
}

export interface UnitVariationPatch<UnifiedVariation> {
  match: UnitVariationMatch;
  update?: DeepPartial<UnifiedVariation>;
  after?: (variation: UnifiedVariation) => UnifiedVariation;
}

export interface UnitUnifiedPatch<UnifiedUnit, UnifiedVariation> {
  id: string; // id de l'unité (ex: 'spearman')
  update?: DeepPartial<UnifiedUnit>;
  variations?: UnitVariationPatch<UnifiedVariation>[];
  after?: (unit: UnifiedUnit) => UnifiedUnit; // échappatoire custom au besoin
}

// Patches pour les Technologies
export interface TechVariationMatch {
  id?: string;
  civsIncludes?: string;
}

export interface TechVariationPatch<TechnologyVariation> {
  match: TechVariationMatch;
  update: DeepPartial<TechnologyVariation>;
  // Optionally attach a small UI hint (tooltip) to this variation patch
  uiTooltip?: string;
}

export interface TechnologyPatch<Technology, TechnologyVariation> {
  id: string; // id de la technologie
  update?: DeepPartial<Technology>;
  variations?: TechVariationPatch<TechnologyVariation>[];
  after?: (tech: Technology) => Technology;
  // Optionally attach a UI tooltip at the technology level
  uiTooltip?: string;
}

// Petit utilitaire deep-merge (non mutatif)
export function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  if (Array.isArray(base)) return (patch as unknown as T) ?? base;

  const result: any = { ...base };
  for (const key of Object.keys(patch as object)) {
    const bVal: any = (base as any)[key];
    const pVal: any = (patch as any)[key];
    if (pVal && typeof pVal === 'object' && !Array.isArray(pVal)) {
      result[key] = deepMerge(bVal, pVal);
    } else if (pVal !== undefined) {
      result[key] = pVal;
    }
  }
  return result as T;
}
