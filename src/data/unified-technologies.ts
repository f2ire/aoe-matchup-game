// Types pour les technologies
export interface TechnologyEffect {
  property: string; // "meleeAttack", "rangedAttack", "meleeArmor", "rangedArmor", "hitpoints", "moveSpeed"
  select: {
    class?: string[][];
    id?: string[];
  };
  effect: string; // "change", "multiply"
  value: number;
  type: string; // "passive", "ability"
}

export interface TechnologyVariation {
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
  costs: {
    food: number;
    wood: number;
    stone: number;
    gold: number;
    vizier: number;
    oliveoil: number;
    total: number;
    popcap: number;
    time: number;
  };
  producedBy: string[];
  icon: string;
  effects: TechnologyEffect[];
}

export interface Technology {
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
  variations: TechnologyVariation[];
}

// Import all technology JSON files
const technologyContext = import.meta.glob('./unified_tec/*.json', { eager: true });

// Parse all technologies
export const allTechnologies: Technology[] = Object.values(technologyContext).map(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module: any) => module.default || module
);

// Filtrer les technologies qui affectent les stats de combat
const combatProperties = [
  'meleeAttack',
  'rangedAttack', 
  'meleeArmor',
  'rangedArmor',
  'hitpoints',
  'moveSpeed'
];

export function isCombatTechnology(tech: Technology): boolean {
  return tech.variations.some(variation => 
    variation.effects?.some(effect => 
      combatProperties.includes(effect.property)
    )
  );
}

// Obtenir les technologies de combat filtrées
export const combatTechnologies = allTechnologies.filter(isCombatTechnology);

// Vérifier si une technologie affecte une unité
export function technologyAffectsUnit(
  tech: TechnologyVariation,
  unitClasses: string[],
  unitId?: string
): boolean {
  if (!tech.effects || tech.effects.length === 0) return false;

  return tech.effects.some(effect => {
    let matchesById = false;
    let matchesByClass = false;
    let matchesByIdAsClass = false;
    
    // Vérifier la sélection par ID (exact match avec l'ID de l'unité)
    if (effect.select?.id && unitId) {
      matchesById = effect.select.id.some(id => 
        id.toLowerCase() === unitId.toLowerCase()
      );
      
      // NOUVEAU: Vérifier aussi si un ID de la tech correspond à une classe de l'unité
      // (ex: tech a id="archer", unité a classe="archer")
      matchesByIdAsClass = effect.select.id.some(id =>
        unitClasses.some(unitClass => 
          unitClass.toLowerCase() === id.toLowerCase()
        )
      );
    }
    
    // Vérifier par classe
    if (effect.select?.class) {
      // Pour chaque groupe de classes, vérifier si l'unité a TOUTES les classes du groupe (AND)
      matchesByClass = effect.select.class.some(classGroup =>
        classGroup.every(className => 
          unitClasses.some(unitClass => 
            unitClass.toLowerCase() === className.toLowerCase()
          )
        )
      );
    }
    
    // Retourner vrai si l'unité correspond par ID OU par classe OU par ID-comme-classe (logique OR)
    return matchesById || matchesByClass || matchesByIdAsClass;
  });
}

// Obtenir les technologies disponibles pour une unité
export function getTechnologiesForUnit(
  unitClasses: string[],
  civAbbr: string,
  age: number,
  unitId?: string
): Technology[] {
  const techs = combatTechnologies.filter(tech => {
    // Vérifier si la civ a accès à cette techno
    if (!tech.civs.includes(civAbbr) && civAbbr !== 'all') {
      return false;
    }
    
    // Vérifier l'âge minimum
    if (tech.minAge > age) {
      return false;
    }
    
    // Vérifier si au moins une variation affecte cette unité
    return tech.variations.some(variation => {
      if (civAbbr !== 'all' && !variation.civs.includes(civAbbr)) return false;
      if (variation.age > age) return false;
      return technologyAffectsUnit(variation, unitClasses, unitId);
    });
  });
  
  return techs;
}

// Obtenir la variation correcte d'une technologie
export function getTechnologyVariation(
  techId: string,
  civAbbr: string,
  age: number
): TechnologyVariation | null {
  const tech = allTechnologies.find(t => t.id === techId);
  if (!tech) return null;

  // Trouver la variation pour cette civ et cet âge
  const variation = tech.variations.find(v => {
    if (civAbbr !== 'all' && !v.civs.includes(civAbbr)) return false;
    if (v.age !== age) return false;
    return true;
  });

  // Si pas de variation exacte, prendre la première qui correspond à l'âge
  if (!variation && civAbbr === 'all') {
    return tech.variations.find(v => v.age === age) || null;
  }

  return variation || null;
}

// Appliquer les effets des technologies aux stats
export interface UnitStats {
  hitpoints: number;
  meleeAttack: number;
  rangedAttack: number;
  meleeArmor: number;
  rangedArmor: number;
  moveSpeed: number;
}

export function applyTechnologyEffects(
  baseStats: UnitStats,
  unitClasses: string[],
  activeTechnologies: TechnologyVariation[],
  unitId?: string
): UnitStats {
  const modifiedStats = { ...baseStats };

  // Collecter tous les effets applicables
  interface ApplicableEffect {
    statKey: keyof UnitStats;
    effectType: 'change' | 'multiply';
    value: number;
  }
  
  const applicableEffects: ApplicableEffect[] = [];

  for (const tech of activeTechnologies) {
    if (!tech.effects) continue;

    for (const effect of tech.effects) {
      // Vérifier si l'effet s'applique à cette unité
      let matchesById = false;
      let matchesByClass = false;
      let matchesByIdAsClass = false;
      
      // Vérifier par ID (exact match avec l'ID de l'unité)
      if (effect.select?.id && unitId) {
        matchesById = effect.select.id.some(id => 
          id.toLowerCase() === unitId.toLowerCase()
        );
        
        // Vérifier aussi si un ID de la tech correspond à une classe de l'unité
        matchesByIdAsClass = effect.select.id.some(id =>
          unitClasses.some(unitClass => 
            unitClass.toLowerCase() === id.toLowerCase()
          )
        );
      }
      
      // Vérifier par classe
      if (effect.select?.class) {
        matchesByClass = effect.select.class.some(classGroup =>
          classGroup.every(className => 
            unitClasses.some(unitClass => 
              unitClass.toLowerCase() === className.toLowerCase()
            )
          )
        );
      }
      
      // L'effet s'applique si l'unité correspond par ID OU par classe OU par ID-comme-classe
      const matches = matchesById || matchesByClass || matchesByIdAsClass;
      if (!matches) continue;

      // Déterminer la propriété concernée
      const property = effect.property;
      if (!combatProperties.includes(property)) continue;

      let statKey: keyof UnitStats;
      switch (property) {
        case 'meleeAttack':
          statKey = 'meleeAttack';
          break;
        case 'rangedAttack':
          statKey = 'rangedAttack';
          break;
        case 'meleeArmor':
          statKey = 'meleeArmor';
          break;
        case 'rangedArmor':
          statKey = 'rangedArmor';
          break;
        case 'hitpoints':
          statKey = 'hitpoints';
          break;
        case 'moveSpeed':
          statKey = 'moveSpeed';
          break;
        default:
          continue;
      }

      // Ajouter l'effet à la liste
      applicableEffects.push({
        statKey,
        effectType: effect.effect as 'change' | 'multiply',
        value: effect.value
      });
    }
  }

  // IMPORTANT: Appliquer les effets dans le bon ordre
  // 1. D'abord tous les "change" (additions)
  // 2. Ensuite tous les "multiply" (pourcentages)
  
  // Phase 1: Appliquer les additions (change)
  for (const effect of applicableEffects) {
    if (effect.effectType === 'change') {
      // Pour moveSpeed, "change" représente un pourcentage
      if (effect.statKey === 'moveSpeed') {
        modifiedStats[effect.statKey] *= (1 + effect.value / 100);
      } else {
        // Pour les autres stats, "change" est une addition pure
        modifiedStats[effect.statKey] += effect.value;
      }
    }
  }
  
  // Phase 2: Appliquer les multiplications (multiply)
  for (const effect of applicableEffects) {
    if (effect.effectType === 'multiply') {
      modifiedStats[effect.statKey] *= effect.value;
    }
  }

  return modifiedStats;
}

// Obtenir toutes les technologies de la même ligne (tous les paliers)
export function getAllTiersFromSameLine(tech: Technology): Technology[] {
  const tierInfo = getTechnologyTier(tech);
  if (!tierInfo) return [tech]; // Pas une technologie à paliers, retourner juste elle-même
  
  const baseName = getTechnologyBaseName(tech.displayClasses[0]);
  const allTiers: Technology[] = [];
  
  // Chercher tous les paliers de 1 à maxTier
  for (let tier = 1; tier <= tierInfo.maxTier; tier++) {
    const targetPattern = `${baseName} ${tier}/${tierInfo.maxTier}`;
    const tierTech = allTechnologies.find(t => t.displayClasses[0] === targetPattern);
    
    if (tierTech) {
      allTiers.push(tierTech);
    }
  }
  
  return allTiers.length > 0 ? allTiers : [tech];
}

// Détecter si une technologie fait partie d'une ligne à paliers
export function getTechnologyTier(tech: Technology): { tier: number; maxTier: number } | null {
  const displayClass = tech.displayClasses[0];
  if (!displayClass) return null;
  
  // Rechercher le pattern "X/Y" dans displayClasses (ex: "Melee Damage Technology 2/3")
  const match = displayClass.match(/(\d+)\/(\d+)/);
  if (!match) return null;
  
  return {
    tier: parseInt(match[1]),
    maxTier: parseInt(match[2])
  };
}

// Extraire la catégorie de base d'une technologie (sans le palier)
export function getTechnologyBaseName(displayClass: string): string {
  // Enlever le pattern "X/Y" pour obtenir le nom de base
  return displayClass.replace(/\s*\d+\/\d+\s*$/, '').trim();
}

// Obtenir toutes les technologies précédentes de la même ligne (cumul automatique)
export function getPreviousTierTechnologies(
  tech: Technology,
  activeTechnologies: Set<string>
): Technology[] {
  const tierInfo = getTechnologyTier(tech);
  if (!tierInfo || tierInfo.tier === 1) return [];
  
  const baseName = getTechnologyBaseName(tech.displayClasses[0]);
  const previousTechs: Technology[] = [];
  
  // Chercher toutes les technologies de tiers inférieurs de la même ligne
  // IMPORTANT : On ne vérifie PAS si elles sont actives, car le palier supérieur les inclut automatiquement
  for (let tier = 1; tier < tierInfo.tier; tier++) {
    const targetPattern = `${baseName} ${tier}/${tierInfo.maxTier}`;
    
    const previousTech = allTechnologies.find(t => 
      t.displayClasses[0] === targetPattern
    );
    
    if (previousTech) {
      previousTechs.push(previousTech);
    }
  }
  
  return previousTechs;
}

// Obtenir toutes les variations actives incluant les paliers précédents
export function getActiveTechnologyVariationsWithTiers(
  activeTechnologies: Set<string>,
  civAbbr: string,
  age: number
): TechnologyVariation[] {
  const variations: TechnologyVariation[] = [];
  const processedTechs = new Set<string>();
  
  for (const techId of activeTechnologies) {
    const tech = allTechnologies.find(t => t.id === techId);
    if (!tech || processedTechs.has(techId)) continue;
    
    // Obtenir les technologies de paliers inférieurs
    const previousTierTechs = getPreviousTierTechnologies(tech, activeTechnologies);
    
    // Ajouter les paliers précédents d'abord
    for (const prevTech of previousTierTechs) {
      if (!processedTechs.has(prevTech.id)) {
        // Utiliser l'âge minimum de la technologie précédente, pas l'âge actuel
        const variation = getTechnologyVariation(prevTech.id, civAbbr, prevTech.minAge);
        if (variation) {
          variations.push(variation);
          processedTechs.add(prevTech.id);
        }
      }
    }
    
    // Puis ajouter la technologie actuelle
    const variation = getTechnologyVariation(techId, civAbbr, tech.minAge);
    if (variation) {
      variations.push(variation);
      processedTechs.add(techId);
    }
  }
  
  return variations;
}

// Catégoriser les technologies par type d'effet principal
export function categorizeTechnology(tech: Technology): string {
  const effects = tech.variations[0]?.effects || [];
  
  // Vérifier si la tech fait partie d'une séquence à paliers (X/Y dans displayClasses)
  const tierInfo = getTechnologyTier(tech);
  const hasTier = !!tierInfo;
  
  // Une tech est sur une ligne séparée si:
  // - Elle est unique: true OU
  // - Elle n'a pas de palier (pas de X/Y) et est unique: false (standalone)
  const isSeparateTech = tech.unique || !hasTier;
  
  for (const effect of effects) {
    if (effect.property === 'hitpoints') {
      return isSeparateTech ? 'HP-Unique' : 'HP';
    }
    if (effect.property === 'meleeAttack') {
      return isSeparateTech ? 'Attack-Melee-Unique' : 'Attack-Melee';
    }
    if (effect.property === 'rangedAttack') {
      return isSeparateTech ? 'Attack-Ranged-Unique' : 'Attack-Ranged';
    }
    if (effect.property === 'meleeArmor') {
      return isSeparateTech ? 'Armor-Melee-Unique' : 'Armor-Melee';
    }
    if (effect.property === 'rangedArmor') {
      return isSeparateTech ? 'Armor-Ranged-Unique' : 'Armor-Ranged';
    }
    if (effect.property === 'moveSpeed') {
      return isSeparateTech ? 'Speed-Unique' : 'Speed';
    }
  }
  
  return 'Other';
}
