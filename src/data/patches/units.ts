import type { UnitUnifiedPatch } from './types';
import { deepMerge } from './types';

// IMPORTANT: on ne dépend ici d'aucune valeur runtime de unified-units.ts pour éviter les cycles.
// Les structures sont manipulées par forme (shape) avec deepMerge.

export const unitPatches: UnitUnifiedPatch<any, any>[] = [
  // Exemple (décommenter et adapter):
  // {
  //   id: 'spearman',
  //   update: {
  //     description: 'Infantry best used against mounted units. (patched)'
  //   },
  //   variations: [
  //     {
  //       match: { age: 2, civsIncludes: 'fr' },
  //       update: { hitpoints: 85 }
  //     }
  //   ]
  // }
];

export function applyUnitPatches(unifiedUnits: any[]): any[] {
  if (!Array.isArray(unifiedUnits) || unitPatches.length === 0) return unifiedUnits;

  return unifiedUnits.map((unit) => {
    const patch = unitPatches.find(p => p.id === unit.id);
    if (!patch) return unit;

    let updated = patch.update ? deepMerge(unit, patch.update) : { ...unit };

    if (patch.variations?.length && Array.isArray(updated.variations)) {
      updated = {
        ...updated,
        variations: updated.variations.map((v: any) => {
          const vPatch = patch.variations!.find(vp => {
            if (vp.match.id && vp.match.id !== v.id) return false;
            if (
              typeof vp.match.age === 'number' &&
              typeof v.age === 'number' &&
              vp.match.age !== v.age
            ) return false;
            if (vp.match.civsIncludes && !v.civs?.includes?.(vp.match.civsIncludes)) return false;
            return true;
          });
          return vPatch ? deepMerge(v, vPatch.update) : v;
        })
      };
    }

    if (patch.after) {
      updated = patch.after(updated);
    }

    return updated;
  });
}
