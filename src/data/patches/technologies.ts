import type { TechnologyPatch } from './types';
import { deepMerge } from './types';
import type { Technology, TechnologyVariation } from '../unified-technologies';

export const technologyPatches: TechnologyPatch<Technology, TechnologyVariation>[] = [
  // camel-support: ensure both meleeArmor and rangedArmor are present on the variation
  {
    id: 'camel-support',
    variations: [
      {
        match: { id: 'camel-support-4' },
        update: {
          effects: [
            {
              property: 'meleeArmor',
              select: { class: [['infantry']] },
              effect: 'change',
              value: 2,
              type: 'ability'
            },
            {
              property: 'rangedArmor',
              select: { class: [['infantry']] },
              effect: 'change',
              value: 2,
              type: 'ability'
            }
          ]
        }
      }
    ]
  },

  // ability-quick-strike: reduce attackSpeed by 0.5 but augment attackSpeed multiply 0.5 for ghulam (preserve unknown effect)
  {
    id: 'ability-quick-strike',
    variations: [
      {
        match: { id: 'ability-quick-strike-1' },
        update: {
          effects: [
            {
              property: 'attackSpeed',
              select: { id: ['ghulam'] },
              effect: 'change',
              value: 0.5,
              type: 'ability'
            },
            {
              property: 'attackSpeed',
              select: { id: ['ghulam'] },
              effect: 'multiply',
              value: 0.5,
              type: 'ability'
            }
          ]
        }
      }
    ]
  },

  // composite-bows: keep user-selected multiplier and tooltip
  {
    id: 'composite-bows',
    uiTooltip: '⚠️ The actual attack speed reduction is -30%, not -33% as shown in the tooltip.',
    variations: [
      {
        match: { id: 'composite-bows-3' },
        update: {
          effects: [
            {
              property: 'attackSpeed',
              select: { class: [['archer', 'infantry']] },
              effect: 'multiply',
              value: 0.76923,
              type: 'passive'
            }
          ]
        }
      }
    ]
  },

  // geometry: add effects targeting trebuchets (+20% base damage and bonus damage)
  {
    id: 'geometry',
    update: {
      effects: [
        {
          property: 'rangedAttack',
          select: { id: ['huihui-pao', 'counterweight-trebuchet', 'traction-trebuchet'] },
          effect: 'multiply',
          value: 1.2,
          type: 'passive'
        },
        {
          property: 'siegeAttack',
          select: { id: ['huihui-pao', 'counterweight-trebuchet', 'traction-trebuchet'] },
          effect: 'multiply',
          value: 1.2,
          type: 'bonus',
          target: { class: [['building']] }
        },
        {
          property: 'siegeAttack',
          select: { id: ['huihui-pao', 'counterweight-trebuchet', 'traction-trebuchet'] },
          effect: 'multiply',
          value: 1.2,
          type: 'bonus',
          target: { class: [['naval', 'unit']] }
        }
      ]
    }
  },

  // chemistry: add effects targeting gunpowder siege/warship units (+25% bonus damage)
  {
    id: 'chemistry',
    update: {
      effects: [
        {
          property: 'siegeAttack',
          select: { class: [['gunpowder', 'siege'], ['gunpowder', 'warship']] },
          effect: 'multiply',
          value: 1.25,
          type: 'bonus',
          target: { class: [["war", "elephant"]] }
        },
        {
          property: 'siegeAttack',
          select: { class: [['gunpowder', 'siege'], ['gunpowder', 'warship']] },
          effect: 'multiply',
          value: 1.25,
          type: 'bonus',
          target: { class: [['building']] }
        },
        {
          property: 'siegeAttack',
          select: { class: [['gunpowder', 'siege'], ['gunpowder', 'warship']] },
          effect: 'multiply',
          value: 1.25,
          type: 'bonus',
          target: { class: [['naval_unit']] }
        },
        {
          property: 'siegeAttack',
          select: { class: [['gunpowder', 'siege'], ['gunpowder', 'warship']] },
          effect: 'multiply',
          value: 1.25,
          type: 'bonus',
          target: { class: [['war_elephant']] }
        },
        {
          property: 'siegeAttack',
          select: { class: [['gunpowder', 'siege'], ['gunpowder', 'warship']] },
          effect: 'multiply',
          value: 1.25,
          type: 'bonus',
          target: { class: [['infantry']] }
        }
      ]
    }
  }
];

export function applyTechnologyPatches(allTechs: Technology[]): Technology[] {
  if (!Array.isArray(allTechs) || technologyPatches.length === 0) return allTechs;

  return allTechs.map((tech) => {
    const patch = technologyPatches.find(p => p.id === tech.id);
    if (!patch) return tech;

    let updated: Technology = patch.update ? deepMerge(tech, patch.update) : { ...tech };

    if (patch.variations?.length && Array.isArray(updated.variations)) {
      updated = {
        ...updated,
        variations: updated.variations.map((v: TechnologyVariation) => {
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
