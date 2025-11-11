// Types pour les technologies
export interface TechnologyEffect {
  property: string; // "meleeAttack", "rangedAttack", "meleeArmor", "rangedArmor", "hitpoints", "moveSpeed", "maxRange", "attackSpeed"
  select?: {
    class?: string[][];
    id?: string[];
  };
  effect: string; // "change", "multiply"
  value: number;
  type: string; // "passive", "ability", "bonus"
  target?: { // Pour les bonus de dégâts
    class: string[][];
  };
}

export interface TechnologyVariation {
  id: string;
  baseId?: string;
  type?: string;
  name?: string;
  pbgid: number;
  attribName: string;
  age?: number;
  civs: string[];
  description?: string;
  classes?: string[];
  displayClasses?: string[];
  unique?: boolean;
  costs?: {
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
  producedBy?: string[];
  icon?: string;
  effects?: TechnologyEffect[];
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
  effects?: TechnologyEffect[]; // Effects au niveau de la technologie (all-optimized_tec.json)
}
import allTechnologiesData from './all-optimized_tec.json';

// Parse all technologies from the unified file
export const allTechnologies: Technology[] = allTechnologiesData.data as Technology[];

// Filtrer les technologies qui affectent les stats de combat
const combatProperties = [
  'meleeAttack',
  'rangedAttack', 
  'meleeArmor',
  'rangedArmor',
  'hitpoints',
  'moveSpeed',
  'maxRange',         // Portée maximale
  'attackSpeed',      // Vitesse d'attaque
  'bonusDamage'       // Dégâts bonus
];

// Classes de cibles non-combattantes à exclure
const nonCombatTargets = [
  'hunt',           // Animaux sauvages
  'herdable',       // Moutons, etc.
  'wildlife',       // Faune
  'gaia',           // Entités neutres
  'building',       // Bâtiments (sauf si c'est une unité de siège)
  'economic'        // Unités économiques
];

export function isCombatTechnology(tech: Technology): boolean {
  // Vérifier les effects au niveau de la technologie (all-optimized_tec.json)
  const techLevelEffects = tech.effects;
  if (techLevelEffects && techLevelEffects.length > 0) {
    const hasCombatEffect = techLevelEffects.some(effect => {
      // Vérifier si c'est une propriété de combat
      if (!combatProperties.includes(effect.property)) return false;
      
      // Exclure les effets qui ciblent uniquement des non-combattants
      if (effect.target?.class) {
        const targetClasses = effect.target.class.flat();
        // Si toutes les cibles sont non-combattantes, ignorer cet effet
        const allNonCombat = targetClasses.every((cls: string) => 
          nonCombatTargets.some(nonCombat => cls.includes(nonCombat))
        );
        if (allNonCombat) return false;
      }
      
      return true;
    });
    if (hasCombatEffect) return true;
  }

  // Aussi vérifier les effects au niveau des variations (fichiers individuels unified_tec/)
  return tech.variations.some(variation => 
    variation.effects?.some(effect => {
      // Vérifier si c'est une propriété de combat
      if (!combatProperties.includes(effect.property)) return false;
      
      // Exclure les effets qui ciblent uniquement des non-combattants
      if (effect.target?.class) {
        const targetClasses = effect.target.class.flat();
        // Si toutes les cibles sont non-combattantes, ignorer cet effet
        const allNonCombat = targetClasses.every((cls: string) => 
          nonCombatTargets.some(nonCombat => cls.includes(nonCombat))
        );
        if (allNonCombat) return false;
      }
      
      return true;
    })
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
    
    // Ne plus filtrer par âge minimum - toutes les technologies sont sélectionnables
    
    // Vérifier si les effects au niveau de la technologie affectent cette unité (all-optimized_tec.json)
    if (tech.effects && tech.effects.length > 0) {
      const affectsUnit = tech.effects.some(effect => {
        let matchesById = false;
        let matchesByClass = false;
        let matchesByIdAsClass = false;
        
        if (effect.select?.id && unitId) {
          matchesById = effect.select.id.some(id => id.toLowerCase() === unitId.toLowerCase());
          matchesByIdAsClass = effect.select.id.some(id =>
            unitClasses.some(unitClass => unitClass.toLowerCase() === id.toLowerCase())
          );
        }
        
        if (effect.select?.class) {
          matchesByClass = effect.select.class.some(classGroup =>
            classGroup.every(className => 
              unitClasses.some(unitClass => unitClass.toLowerCase() === className.toLowerCase())
            )
          );
        }
        
        return matchesById || matchesByClass || matchesByIdAsClass;
      });
      
      if (affectsUnit) return true;
    }
    
    // Vérifier si au moins une variation affecte cette unité (fichiers individuels)
    return tech.variations.some(variation => {
      if (civAbbr !== 'all' && !variation.civs.includes(civAbbr)) return false;
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

  // Vérifier que la technologie est disponible à cet âge
  if (tech.minAge > age) return null;

  // Trouver la variation pour cette civ
  // Note: Dans all-optimized_tec.json, les variations n'ont pas de champ "age"
  // L'âge est déterminé par tech.minAge
  const variation = tech.variations.find(v => {
    if (civAbbr !== 'all' && !v.civs.includes(civAbbr)) return false;
    return true;
  });

  // Si pas de variation trouvée, essayer de prendre la première qui a des effects
  let finalVariation = variation;
  if (!finalVariation) {
    finalVariation = tech.variations.find(v => v.effects && v.effects.length > 0) || tech.variations[0] || null;
  }

  if (!finalVariation) return null;

  // Si les effects sont au niveau de la technologie (all-optimized_tec.json),
  // fusionner avec la variation
  if (tech.effects && tech.effects.length > 0) {
    return {
      ...finalVariation,
      effects: tech.effects
    };
  }

  return finalVariation;
}

// Appliquer les effets des technologies aux stats
export interface UnitStats {
  hitpoints: number;
  meleeAttack: number;
  rangedAttack: number;
  meleeArmor: number;
  rangedArmor: number;
  moveSpeed: number;
  attackSpeed?: number;
  maxRange?: number;
  bonusDamage?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function applyTechnologyEffects(
  baseStats: UnitStats,
  unitClasses: string[],
  activeTechnologies: TechnologyVariation[],
  unitId?: string
): UnitStats {
  // Faire une copie profonde des bonusDamage pour éviter les mutations
  const modifiedStats = { 
    ...baseStats,
    bonusDamage: baseStats.bonusDamage ? baseStats.bonusDamage.map(bonus => ({ ...bonus, classes: [...(bonus.classes || [])] })) : []
  };

  // Collecter tous les effets applicables
  interface ApplicableEffect {
    statKey: keyof UnitStats;
    effectType: 'change' | 'multiply';
    value: number;
  }
  
  interface SpecialEffect {
    property: string;
    effectType: 'change' | 'multiply';
    value: number;
    target?: { class: string[][] };
    type?: string;
  }
  
  const applicableEffects: ApplicableEffect[] = [];
  const specialEffects: SpecialEffect[] = [];

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

      // Traiter les propriétés spéciales
      if (property === 'maxRange' || property === 'attackSpeed') {
        specialEffects.push({
          property,
          effectType: effect.effect as 'change' | 'multiply',
          value: effect.value
        });
        continue;
      }

      // Traiter les bonus de dégâts (type: 'bonus')
      if ((property === 'meleeAttack' || property === 'rangedAttack') && effect.type === 'bonus') {
        specialEffects.push({
          property,
          effectType: effect.effect as 'change' | 'multiply',
          value: effect.value,
          target: effect.target,
          type: 'bonus'
        });
        continue;
      }

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
      // Exclure attackSpeed et bonusDamage qui ne sont pas modifiables ici
      if (effect.statKey === 'attackSpeed' || effect.statKey === 'bonusDamage') continue;
      
      // Pour moveSpeed, "change" représente un pourcentage
      if (effect.statKey === 'moveSpeed') {
        (modifiedStats[effect.statKey] as number) *= (1 + effect.value / 100);
      } else {
        // Pour les autres stats, "change" est une addition pure
        (modifiedStats[effect.statKey] as number) += effect.value;
      }
    }
  }
  
  // Phase 2: Appliquer les multiplications (multiply)
  for (const effect of applicableEffects) {
    if (effect.effectType === 'multiply') {
      // Exclure attackSpeed et bonusDamage qui ne sont pas modifiables ici
      if (effect.statKey === 'attackSpeed' || effect.statKey === 'bonusDamage') continue;
      
      (modifiedStats[effect.statKey] as number) *= effect.value;
    }
  }

  // Phase 3: Appliquer les effets spéciaux (maxRange, attackSpeed, bonus damage)
  
  // Appliquer maxRange
  for (const effect of specialEffects) {
    if (effect.property === 'maxRange' && typeof modifiedStats.maxRange === 'number') {
      if (effect.effectType === 'change') {
        modifiedStats.maxRange += effect.value;
      } else if (effect.effectType === 'multiply') {
        modifiedStats.maxRange *= effect.value;
      }
    }
  }
  
  // Appliquer attackSpeed
  for (const effect of specialEffects) {
    if (effect.property === 'attackSpeed' && typeof modifiedStats.attackSpeed === 'number') {
      if (effect.effectType === 'change') {
        modifiedStats.attackSpeed += effect.value;
      } else if (effect.effectType === 'multiply') {
        modifiedStats.attackSpeed *= effect.value;
      }
    }
  }

  // Appliquer les bonus de dégâts
  if (modifiedStats.bonusDamage && Array.isArray(modifiedStats.bonusDamage)) {
    for (const effect of specialEffects) {
      if (effect.type === 'bonus' && effect.target?.class) {
        // Chercher si un bonus contre cette cible existe déjà
        const targetClasses = effect.target.class.flat();
        const existingBonus = modifiedStats.bonusDamage.find((bonus: { classes?: string[] }) => {
          if (!bonus.classes) return false;
          return targetClasses.every(tc => 
            bonus.classes?.some((bc: string) => bc.toLowerCase() === tc.toLowerCase())
          );
        });

        if (existingBonus) {
          // Modifier le bonus existant
          if (effect.effectType === 'change') {
            existingBonus.value += effect.value;
          } else if (effect.effectType === 'multiply') {
            existingBonus.value *= effect.value;
          }
        } else {
          // Ajouter un nouveau bonus
          if (effect.effectType === 'change') {
            modifiedStats.bonusDamage.push({
              value: effect.value,
              classes: targetClasses
            });
          }
        }
      }
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
  // Utiliser les effects au niveau de la technologie (all-optimized_tec.json) ou au niveau de la variation
  const effects = tech.effects || tech.variations[0]?.effects || [];
  
  // Si la technologie a plusieurs propriétés différentes, la mettre dans "Other"
  const uniqueProperties = new Set(effects.map(e => e.property));
  if (uniqueProperties.size > 1) {
    return 'Other';
  }
  
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
    if (effect.property === 'maxRange') {
      return isSeparateTech ? 'Range-Unique' : 'Range';
    }
    if (effect.property === 'attackSpeed') {
      return isSeparateTech ? 'AttackSpeed-Unique' : 'AttackSpeed';
    }
  }
  
  return 'Other';
}
