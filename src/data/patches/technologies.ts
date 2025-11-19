import type { TechnologyPatch } from './types';
import { deepMerge } from './types';

export const technologyPatches: TechnologyPatch<any, any>[] = [
  // Exemple (décommenter et adapter):
  // {
  //   id: 'melee-damage-1',
  //   update: { description: 'Patched melee damage tier 1' },
  //   variations: [
  //     { match: { civsIncludes: 'fr' }, update: { effects: [{ property: 'meleeAttack', effect: 'change', value: 1, type: 'passive' }] } }
  //   ]
  // }
];

export function applyTechnologyPatches(allTechs: any[]): any[] {
  if (!Array.isArray(allTechs) || technologyPatches.length === 0) return allTechs;

  return allTechs.map((tech) => {
    const patch = technologyPatches.find(p => p.id === tech.id);
    if (!patch) return tech;

    let updated = patch.update ? deepMerge(tech, patch.update) : { ...tech };

    if (patch.variations?.length && Array.isArray(updated.variations)) {
      updated = {
        ...updated,
        variations: updated.variations.map((v: any) => {
          const vPatch = patch.variations!.find(vp => {
            if (vp.match.id && vp.match.id !== v.id) return false;
            if (vp.match.civsIncludes && !v.civs?.includes?.(vp.match.civsIncludes)) return false;
            return true;
          });
          return vPatch ? deepMerge(v, vPatch.update) : v;
        })
      };
    }

    if (patch.after) updated = patch.after(updated);
    return updated;
  });
}
