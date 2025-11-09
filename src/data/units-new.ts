/**
 * Interfaces TypeScript pour les unités d'Age of Empires IV
 * Basées sur les données officielles d'aoe4world/data
 */

export interface UnitCosts {
  food: number;
  wood: number;
  gold: number;
  stone: number;
}

export interface ArmorValue {
  type: string;
  value: number;
}

export interface WeaponRange {
  min: number;
  max: number;
}

export interface WeaponModifier {
  property: string;
  target: {
    class?: string[][];
    id?: string[];
  };
  effect: string;
  value: number;
  type: string;
}

export interface Weapon {
  name: string;
  type: string;
  damage: number;
  speed: number;
  range: WeaponRange;
  modifiers: WeaponModifier[];
}

export interface Movement {
  speed: number;
}

export interface AoE4Unit {
  id: string;
  name: string;
  icon: string;
  hitpoints: number;
  costs: UnitCosts;
  armor: ArmorValue[];
  weapons: Weapon[];
  type: string;
  civs: string[];
  classes: string[];
  displayClasses: string[];
  unique: boolean;
  age: number;
  movement?: Movement;
  description: string;
}

// Import des données extraites
import unitsDataRaw from './aoe4-units.json';

// Cast avec vérification
export const aoe4Units: AoE4Unit[] = Array.isArray(unitsDataRaw) 
  ? (unitsDataRaw as AoE4Unit[])
  : [];

// Log pour debug
if (aoe4Units.length > 0) {
  console.log(`✅ ${aoe4Units.length} unités AoE4 chargées avec succès`);
} else {
  console.error('❌ Aucune unité chargée - vérifiez aoe4-units.json');
}

/**
 * Récupère une unité par son ID
 */
export function getUnitById(id: string): AoE4Unit | undefined {
  return aoe4Units.find(unit => unit.id === id);
}

/**
 * Récupère toutes les unités d'une civilisation
 */
export function getUnitsByCiv(civAbbr: string): AoE4Unit[] {
  return aoe4Units.filter(unit => unit.civs.includes(civAbbr));
}

/**
 * Récupère les unités par type (infantry, cavalry, ranged, etc.)
 */
export function getUnitsByClass(className: string): AoE4Unit[] {
  return aoe4Units.filter(unit => 
    unit.classes.some(c => c.toLowerCase().includes(className.toLowerCase()))
  );
}

/**
 * Filtre les unités communes (disponibles pour toutes les civilisations)
 */
export function getCommonUnits(): AoE4Unit[] {
  return aoe4Units.filter(unit => !unit.unique);
}

/**
 * Filtre les unités uniques
 */
export function getUniqueUnits(): AoE4Unit[] {
  return aoe4Units.filter(unit => unit.unique);
}

/**
 * Calcule le coût total d'une unité
 */
export function getTotalCost(unit: AoE4Unit): number {
  return unit.costs.food + unit.costs.wood + unit.costs.gold + unit.costs.stone;
}

/**
 * Récupère la valeur d'armure pour un type spécifique
 */
export function getArmorValue(unit: AoE4Unit, armorType: string): number {
  const armor = unit.armor.find(a => a.type.toLowerCase() === armorType.toLowerCase());
  return armor?.value || 0;
}

/**
 * Récupère l'arme principale de l'unité
 */
export function getPrimaryWeapon(unit: AoE4Unit): Weapon | undefined {
  return unit.weapons[0];
}

/**
 * Détermine le gagnant d'un matchup simplifié
 * (Peut être amélioré avec une logique plus complexe)
 */
export function determineWinner(unit1: AoE4Unit, unit2: AoE4Unit): string {
  const weapon1 = getPrimaryWeapon(unit1);
  const weapon2 = getPrimaryWeapon(unit2);
  
  if (!weapon1 || !weapon2) return 'draw';
  
  // Calcul simplifié basé sur HP, dégâts et armure
  const armor1Type = weapon2.type === 'ranged' ? 'ranged' : 'melee';
  const armor2Type = weapon1.type === 'ranged' ? 'ranged' : 'melee';
  
  const armor1 = getArmorValue(unit1, armor1Type);
  const armor2 = getArmorValue(unit2, armor2Type);
  
  const effective1 = (unit1.hitpoints / 10) + weapon1.damage - (armor2 / 2);
  const effective2 = (unit2.hitpoints / 10) + weapon2.damage - (armor1 / 2);
  
  if (Math.abs(effective1 - effective2) < 3) {
    return 'draw';
  }
  
  return effective1 > effective2 ? unit1.id : unit2.id;
}

// Interface de compatibilité avec l'ancien format (pour migration progressive)
export interface LegacyUnit {
  id: string;
  name: string;
  icon: string;
  cost: {
    food?: number;
    wood?: number;
    gold?: number;
  };
  hp: number;
  meleeArmor: number;
  rangedArmor: number;
  attack: number;
  type: string;
}

/**
 * Convertit une AoE4Unit en format legacy pour compatibilité
 */
export function toLegacyFormat(unit: AoE4Unit): LegacyUnit {
  const primaryWeapon = getPrimaryWeapon(unit);
  
  return {
    id: unit.id,
    name: unit.name,
    icon: unit.icon,
    cost: {
      food: unit.costs.food || undefined,
      wood: unit.costs.wood || undefined,
      gold: unit.costs.gold || undefined,
    },
    hp: unit.hitpoints,
    meleeArmor: getArmorValue(unit, 'melee'),
    rangedArmor: getArmorValue(unit, 'ranged'),
    attack: primaryWeapon?.damage || 0,
    type: unit.displayClasses[0] || unit.type,
  };
}

/**
 * Exporte toutes les unités au format legacy pour compatibilité
 */
export const unitsLegacy: LegacyUnit[] = aoe4Units.map(toLegacyFormat);
