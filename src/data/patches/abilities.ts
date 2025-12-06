import { TechnologyPatch, deepMerge } from "./types";
import { Ability, AbilityVariation } from "../unified-abilities";

export const abilityPatches: TechnologyPatch<Ability, AbilityVariation>[] = [
  {
    id: 'ability-camel-unease',
    uiTooltip: 'Versus mode: Reduces enemy horse cavalry damage by 20%',
    update: {
      effects: [
        {
          property: 'versusOpponentDamageDebuff',
          select: {
            id: [
              'camel-archer',
              'camel-rider',
              'camel-lancer',
              'desert-raider',
              'atabeg',
              'dervish',
              'trade-caravan',
              'camel'
            ],
            class: [['cavalry', 'horse']]
          },
          effect: 'multiply',
          value: 0.8,
          type: 'ability'
        }
      ]
    }
  }
];

// Créer la nouvelle ability de charge
function createChargeAttackAbility(): Ability {
  return {
    id: 'charge-attack',
    name: 'Charge Attack',
    type: 'ability',
    civs: [],
    displayClasses: [],
    classes: [],
    minAge: 1,
    icon: 'https://data.aoe4world.com/images/abilities/ability-tactical-charge-1.png',
    description: 'Charge before attacking when unit is far enough',
    unique: false,
    active: 'always',
    effects: [
      {
        property: 'bonusDamage',
        select: {
          class: [['knight'], ['merc_ghulam']]
        },
        effect: 'change',
        value: 10,
        type: 'ability'
      }
    ],
    variations: [
      {
        id: 'charge-attack-1',
        baseId: 'charge-attack',
        type: 'ability',
        name: 'Charge Attack',
        pbgid: 999001,
        attribName: 'charge_attack_1',
        age: 1,
        civs: [],
        description: 'Charge before attacking when unit is far enough',
        classes: [],
        displayClasses: [],
        unique: false,
        costs: {
          food: 0,
          wood: 0,
          stone: 0,
          gold: 0,
          vizier: 0,
          oliveoil: 0,
          total: 0,
          popcap: 0,
          time: 0
        },
        producedBy: [],
        effects: [
          {
            property: 'bonusDamage',
            select: {
              class: [['knight'], ['merc_ghulam']]
            },
            effect: 'change',
            value: 10,
            type: 'ability'
          }
        ]
      }
    ],
    shared: {}
  } as Ability;
}

export function applyAbilityPatches(abilities: Ability[]): Ability[] {
  // Ajouter l'ability de charge créée
  const chargeAttackAbility = createChargeAttackAbility();
  const abilitiesWithCharge = [...abilities, chargeAttackAbility];

  return abilitiesWithCharge.map(ability => {
    const patch = abilityPatches.find(p => p.id === ability.id);
    if (!patch) return ability;

    let updated = { ...ability };
    
    if (patch.update) {
      updated = deepMerge(updated, patch.update);
    }

    if (patch.after) {
      updated = patch.after(updated);
    }

    return updated;
  });
}
