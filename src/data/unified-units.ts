/**
 * Chargement et parsing des données unifiées d'AoE4
 * Source: all-unified.json (données officielles aoe4world)
 */

import allUnifiedData from './all-unified.json';

// Interfaces pour la structure all-unified.json
interface UnifiedWeaponRange {
  min: number;
  max: number;
}

interface UnifiedWeaponModifier {
  property: string;
  target: {
    class?: string[][];
    id?: string[];
  };
  effect: string;
  value: number;
  type: string;
}

interface UnifiedWeapon {
  name: string;
  type: string;
  damage: number;
  speed: number;
  range: UnifiedWeaponRange;
  modifiers: UnifiedWeaponModifier[];
  attackSpeed?: number;
  burst?: {
    count: number;
  };
  durations?: {
    aim?: number;
    windup?: number;
    attack?: number;
    winddown?: number;
    reload?: number;
    setup?: number;
    teardown?: number;
  };
}

interface UnifiedArmor {
  type: string;
  value: number;
}

interface UnifiedCosts {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  vizier?: number;
  oliveoil?: number;
  total: number;
  popcap: number;
  time: number;
}

interface UnifiedVariation {
  id: string;
  baseId: string;
  type: string;
  name: string;
  pbgid: number;
  attribName: string;
  age: number;
  civs: string[];
  description: string;
  classes: string[];
  displayClasses: string[];
  unique: boolean;
  costs: UnifiedCosts;
  producedBy: string[];
  icon: string;
  hitpoints: number;
  weapons: UnifiedWeapon[];
  armor?: UnifiedArmor[];
  sight?: {
    line: number;
    height: number;
  };
  movement?: {
    speed: number;
  };
}

interface UnifiedUnit {
  id: string;
  name: string;
  type: string;
  civs: string[];
  unique: boolean;
  displayClasses: string[];
  classes: string[];
  minAge: number;
  icon: string;
  description: string;
  variations: UnifiedVariation[];
}

interface AllUnifiedData {
  __note__: string;
  __version__: string;
  data: Array<UnifiedUnit | Record<string, unknown>>; // Unités ou autres types (buildings, techs)
}

// Cast des données importées
const typedData = allUnifiedData as AllUnifiedData;

// Filtrer uniquement les unités (type === "unit")
export const allUnits = typedData.data.filter(
  (item): item is UnifiedUnit => item.type === 'unit'
);

// Interface simplifiée pour l'utilisation dans l'app (compatible avec AoE4Unit)
export interface AoE4Unit {
  id: string;
  name: string;
  icon: string;
  hitpoints: number;
  costs: {
    food: number;
    wood: number;
    gold: number;
    stone: number;
    oliveoil?: number;    // Huile d'olive (Byzantins) ou Silver (Macédoniens)
  };
  armor: UnifiedArmor[];
  weapons: UnifiedWeapon[];
  type: string;
  civs: string[];
  classes: string[];
  displayClasses: string[];
  unique: boolean;
  age: number;
  movement?: {
    speed: number;
  };
  description: string;
  producedBy?: string[];
  variations?: UnifiedVariation[]; // Garder les variations pour accès détaillé
}

/**
 * Convertit les unités unifiées en format simplifié
 * Prend la première variation (âge minimum) comme référence
 */
export const aoe4Units: AoE4Unit[] = allUnits.map(unit => {
  // Prendre la première variation (généralement âge 2 ou minimum)
  const baseVariation = unit.variations[0];
  
  return {
    id: unit.id,
    name: unit.name,
    icon: unit.icon,
    hitpoints: baseVariation.hitpoints,
    costs: {
      food: baseVariation.costs.food,
      wood: baseVariation.costs.wood,
      gold: baseVariation.costs.gold,
      stone: baseVariation.costs.stone,
      oliveoil: baseVariation.costs.oliveoil,
    },
    armor: baseVariation.armor || [],
    weapons: baseVariation.weapons,
    type: unit.type,
    civs: unit.civs,
    classes: unit.classes,
    displayClasses: unit.displayClasses,
    unique: unit.unique,
    age: unit.minAge,
    movement: baseVariation.movement,
    description: unit.description,
    producedBy: baseVariation.producedBy,
    variations: unit.variations, // Garder toutes les variations
  };
});

// Log de chargement
console.log(`✅ ${aoe4Units.length} unités AoE4 chargées depuis all-unified.json`);
console.log(`📊 Dont ${aoe4Units.filter(u => u.unique).length} unités uniques`);
console.log(`🏰 Total variations: ${allUnits.reduce((sum, u) => sum + u.variations.length, 0)}`);

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
 * Récupère les unités par classe
 */
export function getUnitsByClass(className: string): AoE4Unit[] {
  return aoe4Units.filter(unit => 
    unit.classes.some(c => c.toLowerCase().includes(className.toLowerCase()))
  );
}

/**
 * Récupère la variation d'une unité pour une civ et un âge spécifiques
 */
export function getUnitVariation(
  unitId: string,
  civAbbr: string,
  age: number
): UnifiedVariation | undefined {
  const unit = allUnits.find(u => u.id === unitId);
  if (!unit) return undefined;
  
  // Chercher la variation exacte pour cette civ et cet âge
  return unit.variations.find(v => 
    v.civs.includes(civAbbr) && v.age === age
  ) || unit.variations.find(v => v.age === age); // Fallback sur l'âge seul
}

/**
 * Récupère toutes les variations d'une unité
 */
export function getAllVariations(unitId: string): UnifiedVariation[] {
  const unit = allUnits.find(u => u.id === unitId);
  return unit?.variations || [];
}

/**
 * Calcule le coût total d'une unité (incluant les ressources secondaires)
 */
export function getTotalCost(unit: AoE4Unit): number {
  return unit.costs.food + 
         unit.costs.wood + 
         unit.costs.gold + 
         unit.costs.stone +
         (unit.costs.oliveoil || 0);
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
export function getPrimaryWeapon(unit: AoE4Unit): UnifiedWeapon | undefined {
  return unit.weapons[0];
}

/**
 * Détermine le gagnant d'un matchup simplifié
 * Calcul basé sur HP, dégâts, armure et vitesse d'attaque
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

// Exporter aussi les données brutes pour accès avancé
export { allUnits as unifiedUnits };
export type { UnifiedUnit, UnifiedVariation, UnifiedWeapon, UnifiedArmor, UnifiedCosts };
