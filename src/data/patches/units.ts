import type { UnitUnifiedPatch } from './types';
import { deepMerge } from './types';

// IMPORTANT: on ne dépend ici d'aucune valeur runtime de unified-units.ts pour éviter les cycles.
// Les structures sont manipulées par forme (shape) avec deepMerge.

export const unitPatches: UnitUnifiedPatch<unknown, unknown>[] = [
  // Culverin: Transform multi-class targets to underscored single classes
  {
    id: 'culverin',
    variations: [
      {
        match: { age: 4 },
        after: (variation: unknown) => {
          const v = variation as Record<string, unknown>;
          if (Array.isArray(v.weapons) && v.weapons[0]) {
            const weapon = v.weapons[0] as Record<string, unknown>;
            if (Array.isArray(weapon.modifiers)) {
              weapon.modifiers = weapon.modifiers.map((mod: unknown) => {
                const m = mod as Record<string, unknown>;
                if (
                  m.property === 'siegeAttack' &&
                  m.target &&
                  typeof m.target === 'object' &&
                  Array.isArray((m.target as Record<string, unknown>).class)
                ) {
                  const target = m.target as Record<string, unknown>;
                  const classArray = target.class as unknown[];
                  if (Array.isArray(classArray[0])) {
                    const classes = classArray[0] as string[];
                    if (classes.includes('naval') && classes.includes('unit')) {
                      return { ...m, target: { class: [['naval_unit']] } };
                    }
                    if (classes.includes('war') && classes.includes('elephant')) {
                      return { ...m, target: { class: [['war_elephant']] } };
                    }
                  }
                }
                return m;
              });
            }
          }
          return variation;
        }
      }
    ]
  }
];

export function applyUnitPatches(unifiedUnits: unknown[]): unknown[] {
  if (!Array.isArray(unifiedUnits) || unitPatches.length === 0) return unifiedUnits;

  return unifiedUnits.map((unit) => {
    const u = unit as Record<string, unknown>;
    const patch = unitPatches.find(p => p.id === u.id);
    if (!patch) return unit;

    let updated: Record<string, unknown> = patch.update ? (deepMerge(u, patch.update) as Record<string, unknown>) : { ...u };

    if (patch.variations?.length && Array.isArray(updated.variations)) {
      updated = {
        ...updated,
        variations: (updated.variations as unknown[]).map((v: unknown) => {
          const vData = v as Record<string, unknown>;
          const vPatch = patch.variations!.find(vp => {
            if (vp.match.id && vp.match.id !== vData.id) return false;
            if (
              typeof vp.match.age === 'number' &&
              typeof vData.age === 'number' &&
              vp.match.age !== vData.age
            ) return false;
            if (vp.match.civsIncludes && Array.isArray(vData.civs) && !vData.civs.includes?.(vp.match.civsIncludes)) return false;
            return true;
          });
          let updated_variation: Record<string, unknown> = vPatch ? (deepMerge(vData, vPatch.update) as Record<string, unknown>) : vData;
          // Apply after function at variation level if provided
          if (vPatch?.after) {
            updated_variation = vPatch.after(updated_variation) as Record<string, unknown>;
          }
          return updated_variation;
        })
      };
    }

    if (patch.after) {
      updated = patch.after(updated) as Record<string, unknown>;
    }

    return updated;
  });
}
