import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aoe4Units, AoE4Unit, getUnitVariation, getAvailableAges, getMaxAge, getPrimaryWeapon, getArmorValue, getTotalCost, getTotalCostFromVariation } from "@/data/unified-units";
import type { UnifiedVariation } from "@/data/unified-units";
import { getTechnologiesForUnit, getActiveTechnologyVariationsWithTiers, applyTechnologyEffects, getAllTiersFromSameLine, allTechnologies, type UnitStats } from "@/data/unified-technologies";
import { getAbilitiesForUnit, getActiveAbilityVariations } from "@/data/unified-abilities";
import type { Ability, AbilityVariation } from "@/data/unified-abilities";
import { CIVILIZATIONS, Civilization } from "@/data/civilizations";
import { UnitCard } from "@/components/UnitCard";
import { computeVersus, calculateEqualCostMultipliers, computeVersusAtEqualCost, getVersusDebuffMultiplier } from "@/lib/combat";
import { AgeSelector } from "@/components/AgeSelector";
import { TechnologySelector } from "@/components/TechnologySelector";
import { AbilitySelector } from "@/components/AbilitySelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { motion } from "framer-motion";

// Fonction helper pour gérer le toggle exclusif des technologies à paliers
// Helper: vérifier si une unité est disponible pour une civilisation donnée
const isUnitAvailableForCiv = (unit: AoE4Unit, civ: string) => {
  if (!unit) return false;
  if (civ === "all") return true;
  return unit.civs.includes(civ);
};

// Fonction helper pour gérer le toggle exclusif des technologies à paliers
const handleTieredTechnologyToggle = (
  techId: string,
  activeTechnologies: Set<string>,
  setActiveTechnologies: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  const tech = allTechnologies.find(t => t.id === techId);
  if (!tech) return;
  
  // Obtenir tous les paliers de la même ligne
  const allTiers = getAllTiersFromSameLine(tech);
  const allTierIds = allTiers.map(t => t.id);
  
  const newSet = new Set(activeTechnologies);
  
  // Si la technologie cliquée est déjà active, la désactiver
  if (newSet.has(techId)) {
    newSet.delete(techId);
  } else {
    // Sinon, désactiver tous les autres paliers de la même ligne
    allTierIds.forEach(id => newSet.delete(id));
    // Et activer seulement celui cliqué
    newSet.add(techId);
  }
  
  setActiveTechnologies(newSet);
};

// Fonction pour catégoriser les unités
const categorizeUnit = (unit: AoE4Unit): string => {
  const classes = unit.classes.map(c => c.toLowerCase());
  
  // Cas spéciaux pour les éléphants
  if (classes.includes('worker_elephant')) {
    return 'other';
  }
  if (classes.includes('ballista_elephant')) {
    return 'siege';
  }
  
  // 1. Melee Infantry
  if (classes.includes('infantry') && classes.includes('melee')) {
    return 'melee_infantry';
  }
  // 2. Ranged Units (ranged mais pas siege ni ship)
  if (classes.includes('ranged') && !classes.includes('siege') && !classes.includes('ship') && !classes.includes('naval_unit')) {
    return 'ranged';
  }
  // 3. Monks (avant cavalry car certains moines sont montés)
  if (classes.includes('monk') || classes.includes('religious') || classes.includes('healer_elephant')) {
    return 'monk';
  }
  // 4. Cavalry
  if (classes.includes('cavalry')) {
    return 'cavalry';
  }
  // 5. Siege
  if (classes.includes('siege')) {
    return 'siege';
  }
  // 6. Ships
  if (classes.includes('ship') || classes.includes('naval_unit')) {
    return 'ship';
  }
  
  return 'other';
};

const categoryNames: Record<string, string> = {
  melee_infantry: 'Melee Infantry',
  ranged: 'Ranged Units',
  cavalry: 'Cavalry',
  siege: 'Siege',
  monk: 'Monks',
  ship: 'Ships',
  other: 'Other'
};

const categoryIcons: Record<string, string> = {
  melee_infantry: 'https://data.aoe4world.com/images/buildings/barracks.png',
  ranged: 'https://data.aoe4world.com/images/buildings/archery-range.png',
  cavalry: 'https://data.aoe4world.com/images/buildings/stable.png',
  siege: 'https://data.aoe4world.com/images/buildings/siege-workshop.png',
  monk: 'https://data.aoe4world.com/images/buildings/monastery.png',
  ship: 'https://data.aoe4world.com/images/buildings/dock.png',
  other: 'https://data.aoe4world.com/images/buildings/house.png'
};

const categoryOrder = ['melee_infantry', 'ranged', 'cavalry', 'siege', 'monk', 'ship', 'other'];

const Sandbox = () => {
  const navigate = useNavigate();
  const [isVersus, setIsVersus] = useState<boolean>(false); // toggle Versus vs Comparative
  const [atEqualCost, setAtEqualCost] = useState<boolean>(false); // toggle At Equal Cost (versus only)
  
  // Filtres de civilisation indépendants
  const [selectedCivAlly, setSelectedCivAlly] = useState<string>("all");
  const [selectedCivEnemy, setSelectedCivEnemy] = useState<string>("all");
  
  // Âges sélectionnés (initialisés plus tard)
  const [selectedAgeAlly, setSelectedAgeAlly] = useState<number>(4);
  const [selectedAgeEnemy, setSelectedAgeEnemy] = useState<number>(4);
  
  // État d'ouverture/fermeture des catégories
  const [openCategoriesAlly, setOpenCategoriesAlly] = useState<Record<string, boolean>>({
    melee_infantry: true,
    ranged: true,
    cavalry: true,
    siege: true,
    monk: true,
    ship: true,
    other: true
  });
  
  const [openCategoriesEnemy, setOpenCategoriesEnemy] = useState<Record<string, boolean>>({
    melee_infantry: true,
    ranged: true,
    cavalry: true,
    siege: true,
    monk: true,
    ship: true,
    other: true
  });
  
  // Toggle category visibility
  const toggleCategoryAlly = (category: string) => {
    setOpenCategoriesAlly(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  const toggleCategoryEnemy = (category: string) => {
    setOpenCategoriesEnemy(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  // Filtrer les unités alliées par civilisation
  const filteredUnitsAlly = useMemo(() => {
    if (selectedCivAlly === "all") {
      return aoe4Units;
    }
    return aoe4Units.filter(unit => unit.civs.includes(selectedCivAlly));
  }, [selectedCivAlly]);
  
  // Filtrer les unités ennemies par civilisation
  const filteredUnitsEnemy = useMemo(() => {
    if (selectedCivEnemy === "all") {
      return aoe4Units;
    }
    return aoe4Units.filter(unit => unit.civs.includes(selectedCivEnemy));
  }, [selectedCivEnemy]);
  
  // Catégoriser les unités alliées
  const categorizedUnitsAlly = useMemo(() => {
    const categories: Record<string, AoE4Unit[]> = {};
    filteredUnitsAlly.forEach(unit => {
      const category = categorizeUnit(unit);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(unit);
    });
    return categories;
  }, [filteredUnitsAlly]);
  
  // Catégoriser les unités ennemies
  const categorizedUnitsEnemy = useMemo(() => {
    const categories: Record<string, AoE4Unit[]> = {};
    filteredUnitsEnemy.forEach(unit => {
      const category = categorizeUnit(unit);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(unit);
    });
    return categories;
  }, [filteredUnitsEnemy]);
  
  // Aucune unité sélectionnée par défaut
  const [unit1, setUnit1] = useState<AoE4Unit | null>(null);
  const [unit2, setUnit2] = useState<AoE4Unit | null>(null);
  
  // Variations actuelles selon l'âge sélectionné
  const [variationAlly, setVariationAlly] = useState<UnifiedVariation | null>(null);
  const [variationEnemy, setVariationEnemy] = useState<UnifiedVariation | null>(null);
  
  // Technologies actives
  const [activeTechnologiesAlly, setActiveTechnologiesAlly] = useState<Set<string>>(new Set());
  const [activeTechnologiesEnemy, setActiveTechnologiesEnemy] = useState<Set<string>>(new Set());
  
  // Abilities actives
  const [activeAbilitiesAlly, setActiveAbilitiesAlly] = useState<Set<string>>(new Set());
  const [activeAbilitiesEnemy, setActiveAbilitiesEnemy] = useState<Set<string>>(new Set());
  
  // Si la civilisation change et que l'unité sélectionnée n'est pas disponible, réinitialiser (Allié)
  useEffect(() => {
    if (unit1 && !isUnitAvailableForCiv(unit1, selectedCivAlly)) {
      setUnit1(null);
      setVariationAlly(null);
      setActiveTechnologiesAlly(new Set());
      setActiveAbilitiesAlly(new Set());
    }
  }, [selectedCivAlly, unit1]);
  
  // Si la civilisation change et que l'unité sélectionnée n'est pas disponible, réinitialiser (Ennemi)
  useEffect(() => {
    if (unit2 && !isUnitAvailableForCiv(unit2, selectedCivEnemy)) {
      setUnit2(null);
      setVariationEnemy(null);
      setActiveTechnologiesEnemy(new Set());
      setActiveAbilitiesEnemy(new Set());
    }
  }, [selectedCivEnemy, unit2]);
  
  // Mettre à jour l'âge maximum quand l'unité ou la civ change (Ally)
  useEffect(() => {
    if (unit1) {
      const maxAge = getMaxAge(unit1.id, selectedCivAlly);
      setSelectedAgeAlly(maxAge);
    }
  }, [unit1, selectedCivAlly]);
  
  // Mettre à jour l'âge maximum quand l'unité ou la civ change (Enemy)
  useEffect(() => {
    if (unit2) {
      const maxAge = getMaxAge(unit2.id, selectedCivEnemy);
      setSelectedAgeEnemy(maxAge);
    }
  }, [unit2, selectedCivEnemy]);
  
  // Mettre à jour la variation Ally quand l'unité, la civ ou l'âge change
  useEffect(() => {
    if (unit1) {
      const variation = getUnitVariation(unit1.id, selectedCivAlly, selectedAgeAlly);
      setVariationAlly(variation || null);
    }
  }, [unit1, selectedCivAlly, selectedAgeAlly]);
  
  // Mettre à jour la variation Enemy quand l'unité, la civ ou l'âge change
  useEffect(() => {
    if (unit2) {
      const variation = getUnitVariation(unit2.id, selectedCivEnemy, selectedAgeEnemy);
      setVariationEnemy(variation || null);
    }
  }, [unit2, selectedCivEnemy, selectedAgeEnemy]);
  
  // Calculer les technologies disponibles
  const techsAlly = unit1 ? getTechnologiesForUnit(unit1.classes, selectedCivAlly, selectedAgeAlly, unit1.id) : [];
  const techsEnemy = unit2 ? getTechnologiesForUnit(unit2.classes, selectedCivEnemy, selectedAgeEnemy, unit2.id) : [];

  // Calculer les abilities disponibles (memoisées pour stabilité des dépendances)
  const abilitiesAlly = useMemo<Ability[]>(() => {
    return unit1 ? getAbilitiesForUnit(unit1.classes, selectedCivAlly, selectedAgeAlly, unit1.id) : [];
  }, [unit1, selectedCivAlly, selectedAgeAlly]);

  const abilitiesEnemy = useMemo<Ability[]>(() => {
    return unit2 ? getAbilitiesForUnit(unit2.classes, selectedCivEnemy, selectedAgeEnemy, unit2.id) : [];
  }, [unit2, selectedCivEnemy, selectedAgeEnemy]);

  // Ajouter automatiquement aux sets les abilities dont active === 'always' (mais permettre de les désactiver)
  useEffect(() => {
    if (!unit1) return;
    const defaults = abilitiesAlly
      .filter(a => a.active === 'always' || a.variations?.some((v: AbilityVariation) => v.active === 'always'))
      .map(a => a.id);
    if (defaults.length === 0) return;
    // N'ajouter les defaults que si l'utilisateur n'a encore rien sélectionné
    setActiveAbilitiesAlly(prev => {
      if (prev.size > 0) return prev; // l'utilisateur a déjà choisi, ne pas écraser
      const merged = new Set(prev);
      for (const id of defaults) merged.add(id);
      return merged;
    });
  }, [unit1, selectedCivAlly, selectedAgeAlly, abilitiesAlly]);

  useEffect(() => {
    if (!unit2) return;
    const defaults = abilitiesEnemy
      .filter(a => a.active === 'always' || a.variations?.some((v: AbilityVariation) => v.active === 'always'))
      .map(a => a.id);
    if (defaults.length === 0) return;
    // N'ajouter les defaults que si l'utilisateur n'a encore rien sélectionné
    setActiveAbilitiesEnemy(prev => {
      if (prev.size > 0) return prev;
      const merged = new Set(prev);
      for (const id of defaults) merged.add(id);
      return merged;
    });
  }, [unit2, selectedCivEnemy, selectedAgeEnemy, abilitiesEnemy]);
  
  // Calculer les stats modifiées avec useMemo pour forcer le recalcul complet à chaque changement
  const modifiedAllyStats = useMemo(() => {
    const allyData = variationAlly || unit1;
    if (!allyData) return {
      hitpoints: 0,
      meleeAttack: 0,
      rangedAttack: 0,
      meleeArmor: 0,
      rangedArmor: 0,
      moveSpeed: 0,
      attackSpeed: 0,
      bonusDamage: []
    };
    
    const allyWeapon = getPrimaryWeapon(allyData);
    
    // Stats de base (toujours recalculées depuis la source)
    const baseStats: UnitStats = {
      hitpoints: allyData.hitpoints,
      meleeAttack: allyWeapon?.type === 'melee' ? (allyWeapon.damage || 0) : 0,
      rangedAttack: allyWeapon?.type === 'ranged' ? (allyWeapon.damage || 0) : 0,
      meleeArmor: getArmorValue(allyData, "melee"),
      rangedArmor: getArmorValue(allyData, "ranged"),
      moveSpeed: 'movement' in allyData ? allyData.movement?.speed || 0 : 0,
      attackSpeed: allyWeapon?.speed || 0,
      maxRange: allyWeapon?.range?.max || 0,
      bonusDamage: allyWeapon?.modifiers || []
    };
    
    // Obtenir les variations des technologies actives (incluant les paliers précédents automatiquement)
    const techVariations = getActiveTechnologyVariationsWithTiers(
      activeTechnologiesAlly,
      selectedCivAlly,
      selectedAgeAlly
    );
    
    // Obtenir les variations des abilities actives
    const abilityVariations = getActiveAbilityVariations(
      activeAbilitiesAlly,
      selectedCivAlly,
      selectedAgeAlly
    );
    
    // Appliquer les technologies + abilities depuis zéro
    const withTechs = applyTechnologyEffects(baseStats, unit1?.classes || [], techVariations, unit1?.id);
    return applyTechnologyEffects(withTechs, unit1?.classes || [], abilityVariations, unit1?.id);
  }, [unit1, variationAlly, activeTechnologiesAlly, activeAbilitiesAlly, selectedCivAlly, selectedAgeAlly]);
  
  const modifiedEnemyStats = useMemo(() => {
    const enemyData = variationEnemy || unit2;
    if (!enemyData) return {
      hitpoints: 0,
      meleeAttack: 0,
      rangedAttack: 0,
      meleeArmor: 0,
      rangedArmor: 0,
      moveSpeed: 0,
      attackSpeed: 0,
      bonusDamage: []
    };
    
    const enemyWeapon = getPrimaryWeapon(enemyData);
    
    // Stats de base (toujours recalculées depuis la source)
    const baseStats: UnitStats = {
      hitpoints: enemyData.hitpoints,
      meleeAttack: enemyWeapon?.type === 'melee' ? (enemyWeapon.damage || 0) : 0,
      rangedAttack: enemyWeapon?.type === 'ranged' ? (enemyWeapon.damage || 0) : 0,
      meleeArmor: getArmorValue(enemyData, "melee"),
      rangedArmor: getArmorValue(enemyData, "ranged"),
      moveSpeed: 'movement' in enemyData ? enemyData.movement?.speed || 0 : 0,
      attackSpeed: enemyWeapon?.speed || 0,
      maxRange: enemyWeapon?.range?.max || 0,
      bonusDamage: enemyWeapon?.modifiers || []
    };
    
    // Obtenir les variations des technologies actives (incluant les paliers précédents automatiquement)
    const techVariations = getActiveTechnologyVariationsWithTiers(
      activeTechnologiesEnemy,
      selectedCivEnemy,
      selectedAgeEnemy
    );
    
    // Obtenir les variations des abilities actives
    const abilityVariations = getActiveAbilityVariations(
      activeAbilitiesEnemy,
      selectedCivEnemy,
      selectedAgeEnemy
    );
    
    // Appliquer les technologies + abilities depuis zéro
    const withTechs = applyTechnologyEffects(baseStats, unit2?.classes || [], techVariations, unit2?.id);
    return applyTechnologyEffects(withTechs, unit2?.classes || [], abilityVariations, unit2?.id);
  }, [unit2, variationEnemy, activeTechnologiesEnemy, activeAbilitiesEnemy, selectedCivEnemy, selectedAgeEnemy]);
  
  // Calculer les stats pour la comparaison
  const allyData = variationAlly || unit1;
  const enemyData = variationEnemy || unit2;
  
  // Créer des variations modifiées avec les technologies appliquées
  const modifiedVariationAlly = variationAlly ? (() => {
    // Calculer le debuff versus des abilités ennemies
    const debuffMultiplier = unit2 && activeAbilitiesEnemy.size > 0 
      ? getVersusDebuffMultiplier(variationAlly.classes || [], Array.from(activeAbilitiesEnemy))
      : 1.0;
    
    return {
      ...variationAlly,
      hitpoints: modifiedAllyStats.hitpoints,
      weapons: variationAlly.weapons.map(weapon => ({
        ...weapon,
        damage: (weapon.type === 'melee' ? modifiedAllyStats.meleeAttack : modifiedAllyStats.rangedAttack) * debuffMultiplier,
        speed: modifiedAllyStats.attackSpeed,
        range: weapon.range ? {
          ...weapon.range,
          max: modifiedAllyStats.maxRange || weapon.range.max
        } : undefined,
        modifiers: modifiedAllyStats.bonusDamage
      })),
      armor: [
        { type: 'melee', value: modifiedAllyStats.meleeArmor },
        { type: 'ranged', value: modifiedAllyStats.rangedArmor }
      ],
      movement: variationAlly.movement ? {
        ...variationAlly.movement,
        speed: modifiedAllyStats.moveSpeed
      } : undefined
    };
  })() : undefined;
  
  const modifiedVariationEnemy = variationEnemy ? (() => {
    // Calculer le debuff versus des abilités ally
    const debuffMultiplier = unit1 && activeAbilitiesAlly.size > 0 
      ? getVersusDebuffMultiplier(variationEnemy.classes || [], Array.from(activeAbilitiesAlly))
      : 1.0;
    
    return {
      ...variationEnemy,
      hitpoints: modifiedEnemyStats.hitpoints,
      weapons: variationEnemy.weapons.map(weapon => ({
        ...weapon,
        damage: (weapon.type === 'melee' ? modifiedEnemyStats.meleeAttack : modifiedEnemyStats.rangedAttack) * debuffMultiplier,
        speed: modifiedEnemyStats.attackSpeed,
        range: weapon.range ? {
          ...weapon.range,
          max: modifiedEnemyStats.maxRange || weapon.range.max
        } : undefined,
        modifiers: modifiedEnemyStats.bonusDamage
      })),
      armor: [
        { type: 'melee', value: modifiedEnemyStats.meleeArmor },
        { type: 'ranged', value: modifiedEnemyStats.rangedArmor }
      ],
      movement: variationEnemy.movement ? {
        ...variationEnemy.movement,
        speed: modifiedEnemyStats.moveSpeed
      } : undefined
    };
  })() : undefined;
  
  const modifiedUnit1 = unit1 && !variationAlly ? (() => {
    // Calculer le debuff versus des abilités ennemies
    const debuffMultiplier = unit2 && activeAbilitiesEnemy.size > 0 
      ? getVersusDebuffMultiplier(unit1.classes || [], Array.from(activeAbilitiesEnemy))
      : 1.0;
    
    return {
      ...unit1,
      hitpoints: modifiedAllyStats.hitpoints,
      weapons: unit1.weapons.map(weapon => ({
        ...weapon,
        damage: (weapon.type === 'melee' ? modifiedAllyStats.meleeAttack : modifiedAllyStats.rangedAttack) * debuffMultiplier,
        speed: modifiedAllyStats.attackSpeed,
        range: weapon.range ? {
          ...weapon.range,
          max: modifiedAllyStats.maxRange || weapon.range.max
        } : undefined,
        modifiers: modifiedAllyStats.bonusDamage
      })),
      armor: [
        { type: 'melee', value: modifiedAllyStats.meleeArmor },
        { type: 'ranged', value: modifiedAllyStats.rangedArmor }
      ],
      movement: unit1.movement ? {
        ...unit1.movement,
        speed: modifiedAllyStats.moveSpeed
      } : undefined
    };
  })() : undefined;
  
  const modifiedUnit2 = unit2 && !variationEnemy ? (() => {
    // Calculer le debuff versus des abilités ally
    const debuffMultiplier = unit1 && activeAbilitiesAlly.size > 0 
      ? getVersusDebuffMultiplier(unit2.classes || [], Array.from(activeAbilitiesAlly))
      : 1.0;
    
    return {
      ...unit2,
      hitpoints: modifiedEnemyStats.hitpoints,
      weapons: unit2.weapons.map(weapon => ({
        ...weapon,
        damage: (weapon.type === 'melee' ? modifiedEnemyStats.meleeAttack : modifiedEnemyStats.rangedAttack) * debuffMultiplier,
        speed: modifiedEnemyStats.attackSpeed,
        range: weapon.range ? {
          ...weapon.range,
          max: modifiedEnemyStats.maxRange || weapon.range.max
        } : undefined,
        modifiers: modifiedEnemyStats.bonusDamage
      })),
      armor: [
        { type: 'melee', value: modifiedEnemyStats.meleeArmor },
        { type: 'ranged', value: modifiedEnemyStats.rangedArmor }
      ],
      movement: unit2.movement ? {
        ...unit2.movement,
        speed: modifiedEnemyStats.moveSpeed
      } : undefined
    };
  })() : undefined;
  
  // Stats finales avec coûts
  const allyStats = allyData ? {
    hp: modifiedAllyStats.hitpoints,
    attack: (() => {
      const baseAttack = Math.max(modifiedAllyStats.meleeAttack, modifiedAllyStats.rangedAttack);
      // En mode versus, appliquer le debuff des abilités ennemies sur les dégâts de l'ally
      if (unit1 && unit2 && activeAbilitiesEnemy.size > 0) {
        const debuffMultiplier = getVersusDebuffMultiplier(
          unit1.classes || [],
          Array.from(activeAbilitiesEnemy)
        );
        return baseAttack * debuffMultiplier;
      }
      return baseAttack;
    })(),
    meleeArmor: modifiedAllyStats.meleeArmor,
    rangedArmor: modifiedAllyStats.rangedArmor,
    speed: modifiedAllyStats.moveSpeed,
    attackSpeed: modifiedAllyStats.attackSpeed || 0,
    maxRange: modifiedAllyStats.maxRange || 0,
    bonusDamage: modifiedAllyStats.bonusDamage || [],
    cost: variationAlly ? getTotalCostFromVariation(variationAlly) : (unit1 ? getTotalCost(unit1) : 0),
    costs: variationAlly ? variationAlly.costs : (unit1 ? unit1.costs : undefined)
  } : null;
  
  const enemyStats = enemyData ? {
    hp: modifiedEnemyStats.hitpoints,
    attack: (() => {
      const baseAttack = Math.max(modifiedEnemyStats.meleeAttack, modifiedEnemyStats.rangedAttack);
      // En mode versus, appliquer le debuff des abilités ally sur les dégâts de l'enemy
      if (unit1 && unit2 && activeAbilitiesAlly.size > 0) {
        const debuffMultiplier = getVersusDebuffMultiplier(
          unit2.classes || [],
          Array.from(activeAbilitiesAlly)
        );
        return baseAttack * debuffMultiplier;
      }
      return baseAttack;
    })(),
    meleeArmor: modifiedEnemyStats.meleeArmor,
    rangedArmor: modifiedEnemyStats.rangedArmor,
    speed: modifiedEnemyStats.moveSpeed,
    attackSpeed: modifiedEnemyStats.attackSpeed || 0,
    maxRange: modifiedEnemyStats.maxRange || 0,
    bonusDamage: modifiedEnemyStats.bonusDamage || [],
    cost: variationEnemy ? getTotalCostFromVariation(variationEnemy) : (unit2 ? getTotalCost(unit2) : 0),
    costs: variationEnemy ? variationEnemy.costs : (unit2 ? unit2.costs : undefined)
  } : null;

  // Créer des listes de bonus alignées pour chaque unité
  // 1. D'abord les bonus communs (même cible)
  // 2. Ensuite les bonus uniques de chaque côté
  const allyBonuses = allyStats?.bonusDamage || [];
  const enemyBonuses = enemyStats?.bonusDamage || [];
  
  const matchedTargets = new Set<string>();
  const alignedAllyBonuses: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const alignedEnemyBonuses: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Phase 1: Ajouter les bonus communs (alignés)
  allyBonuses.forEach((allyBonus: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const allyTarget = allyBonus.target?.class?.flat().join(' ') || '';
    const enemyBonus = enemyBonuses.find((b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const enemyTarget = b.target?.class?.flat().join(' ') || '';
      return enemyTarget === allyTarget;
    });
    
    if (enemyBonus) {
      matchedTargets.add(allyTarget);
      alignedAllyBonuses.push(allyBonus);
      alignedEnemyBonuses.push(enemyBonus);
    }
  });
  
  // Phase 2: Ajouter les bonus non-matchés
  const unmatchedAlly = allyBonuses.filter((b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const target = b.target?.class?.flat().join(' ') || '';
    return !matchedTargets.has(target);
  });
  
  const unmatchedEnemy = enemyBonuses.filter((b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const target = b.target?.class?.flat().join(' ') || '';
    return !matchedTargets.has(target);
  });
  
  // Ajouter les bonus non-matchés avec des lignes vides pour maintenir l'alignement
  const maxUnmatched = Math.max(unmatchedAlly.length, unmatchedEnemy.length);
  
  for (let i = 0; i < maxUnmatched; i++) {
    if (i < unmatchedAlly.length) {
      alignedAllyBonuses.push(unmatchedAlly[i]);
    } else {
      alignedAllyBonuses.push({ hidden: true });
    }
    
    if (i < unmatchedEnemy.length) {
      alignedEnemyBonuses.push(unmatchedEnemy[i]);
    } else {
      alignedEnemyBonuses.push({ hidden: true });
    }
  }
  
  const maxBonusDamageLines = alignedAllyBonuses.length;

  // Si pas d'unités chargées, afficher un message
  if (!aoe4Units || aoe4Units.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Erreur de chargement</h2>
          <p className="text-muted-foreground">Les données des unités n'ont pas pu être chargées.</p>
          <p className="text-sm text-muted-foreground mt-2">Vérifiez la console pour plus de détails.</p>
          <Button onClick={() => navigate("/")} className="mt-4">Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        <div className="text-center mb-8 space-y-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary mb-2">Sandbox Mode</h1>
            <p className="text-muted-foreground text-lg">Compare any two units from any civilizations!</p>
          </div>
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-4">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setIsVersus(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  !isVersus ? 'bg-primary text-background' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Comparative
              </button>
              <div className="w-px bg-border" />
              <button
                type="button"
                onClick={() => setIsVersus(true)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  isVersus ? 'bg-primary text-background' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Versus
              </button>
            </div>
            {isVersus && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card">
                <input
                  type="checkbox"
                  id="atEqualCost"
                  checked={atEqualCost}
                  onChange={(e) => setAtEqualCost(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="atEqualCost" className="text-sm font-medium cursor-pointer">
                  At Equal Cost
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Colonne Alliée */}
          <div className="space-y-4 flex flex-col items-center md:items-end">
            <label className="text-sm font-medium text-foreground">Civilization (Ally):</label>
            <Select value={selectedCivAlly} onValueChange={setSelectedCivAlly}>
              <SelectTrigger className="bg-secondary border-border h-14">
                <SelectValue>
                  {selectedCivAlly === "all" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                        <span className="text-xl">?</span>
                      </div>
                      <span className="font-medium">All Civilizations</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img 
                        src={CIVILIZATIONS.find(c => c.abbr === selectedCivAlly)?.flagPath} 
                        alt="" 
                        className="w-8 h-8 object-contain" 
                      />
                      <span className="font-medium">
                        {CIVILIZATIONS.find(c => c.abbr === selectedCivAlly)?.name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[400px]">
                <SelectItem value="all" className="data-[state=checked]:font-bold py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl text-white group-hover:text-black transition-colors">?</span>
                    </div>
                    <span className="font-medium text-white group-hover:text-black transition-colors">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="data-[state=checked]:font-bold py-3 group">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium text-white group-hover:text-black transition-colors">{civ.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium text-foreground mt-6 block">Friendly Unit:</label>
            <Select value={unit1?.id || ""} onValueChange={(id) => setUnit1(filteredUnitsAlly.find(u => u.id === id) || null)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a unit..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[500px]">
                {categoryOrder.map(categoryKey => {
                  const units = categorizedUnitsAlly[categoryKey];
                  if (!units || units.length === 0) return null;
                  
                  const isOpen = openCategoriesAlly[categoryKey];
                  
                  return (
                    <SelectGroup key={categoryKey}>
                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCategoryAlly(categoryKey);
                        }}
                        className="cursor-pointer hover:bg-accent px-2 py-2 rounded group"
                      >
                        <SelectLabel className="text-primary group-hover:text-background font-semibold flex items-center gap-2 cursor-pointer">
                          <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
                          <img 
                            src={categoryIcons[categoryKey]} 
                            alt="" 
                            className="w-5 h-5 object-contain inline-block" 
                          />
                          <span>{categoryNames[categoryKey]} ({units.length})</span>
                        </SelectLabel>
                      </div>
                      {isOpen && units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id} className="data-[state=checked]:font-bold pl-8 group">
                          <div className="flex items-center gap-2">
                            <img src={unit.icon} alt={unit.name} className="w-6 h-6 object-contain" />
                            <span className="text-white group-hover:text-black transition-colors">{unit.name}</span>
                            {unit.unique && <span className="text-xs text-primary">(Unique)</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{filteredUnitsAlly.length} units available</p>
          </div>

          {/* Colonne Ennemie */}
          <div className="space-y-4 flex flex-col items-center md:items-start">
            <label className="text-sm font-medium text-foreground">Civilization (Enemy):</label>
            <Select value={selectedCivEnemy} onValueChange={setSelectedCivEnemy}>
              <SelectTrigger className="bg-secondary border-border h-14">
                <SelectValue>
                  {selectedCivEnemy === "all" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                        <span className="text-xl">?</span>
                      </div>
                      <span className="font-medium">All Civilizations</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img 
                        src={CIVILIZATIONS.find(c => c.abbr === selectedCivEnemy)?.flagPath} 
                        alt="" 
                        className="w-8 h-8 object-contain" 
                      />
                      <span className="font-medium">
                        {CIVILIZATIONS.find(c => c.abbr === selectedCivEnemy)?.name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[400px]">
                <SelectItem value="all" className="data-[state=checked]:font-bold py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl text-white group-hover:text-black transition-colors">?</span>
                    </div>
                    <span className="font-medium text-white group-hover:text-black transition-colors">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="data-[state=checked]:font-bold py-3 group">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium text-white group-hover:text-black transition-colors">{civ.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium text-foreground mt-6 block">Enemy Unit:</label>
            <Select value={unit2?.id || ""} onValueChange={(id) => setUnit2(filteredUnitsEnemy.find(u => u.id === id) || null)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a unit..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[500px]">
                {categoryOrder.map(categoryKey => {
                  const units = categorizedUnitsEnemy[categoryKey];
                  if (!units || units.length === 0) return null;
                  
                  const isOpen = openCategoriesEnemy[categoryKey];
                  
                  return (
                    <SelectGroup key={categoryKey}>
                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCategoryEnemy(categoryKey);
                        }}
                        className="cursor-pointer hover:bg-accent px-2 py-2 rounded group"
                      >
                        <SelectLabel className="text-primary group-hover:text-background font-semibold flex items-center gap-2 cursor-pointer">
                          <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
                          <img 
                            src={categoryIcons[categoryKey]} 
                            alt="" 
                            className="w-5 h-5 object-contain inline-block" 
                          />
                          <span>{categoryNames[categoryKey]} ({units.length})</span>
                        </SelectLabel>
                      </div>
                      {isOpen && units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id} className="data-[state=checked]:font-bold pl-8 group">
                          <div className="flex items-center gap-2">
                            <img src={unit.icon} alt={unit.name} className="w-6 h-6 object-contain" />
                            <span className="text-white group-hover:text-black transition-colors">{unit.name}</span>
                            {unit.unique && <span className="text-xs text-primary">(Unique)</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{filteredUnitsEnemy.length} units available</p>
          </div>
        </div>

        {/* Zone de comparaison / versus */}
        {!isVersus && (
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {/* Ally Unit */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-4 justify-center"
              >
              {unit1 && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 space-y-3">
                    <AgeSelector
                      availableAges={getAvailableAges(unit1.id, selectedCivAlly)}
                      selectedAge={selectedAgeAlly}
                      onAgeChange={setSelectedAgeAlly}
                      orientation="left"
                    />
                    <TechnologySelector
                      technologies={techsAlly}
                      activeTechnologies={activeTechnologiesAlly}
                      onToggle={(techId) => {
                        handleTieredTechnologyToggle(techId, activeTechnologiesAlly, setActiveTechnologiesAlly);
                      }}
                      orientation="left"
                    />
                    <AbilitySelector
                      abilities={abilitiesAlly}
                      activeAbilities={activeAbilitiesAlly}
                      onToggle={(abilityId) => {
                        const newSet = new Set(activeAbilitiesAlly);
                        if (newSet.has(abilityId)) {
                          newSet.delete(abilityId);
                        } else {
                          newSet.add(abilityId);
                        }
                        setActiveAbilitiesAlly(newSet);
                      }}
                      orientation="left"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex justify-end">
                    <UnitCard
                      className="w-[280px]"
                      variation={modifiedVariationAlly}
                      unit={modifiedUnit1}
                      side="left"
                      isSelected={true}
                      compareHp={enemyStats?.hp}
                      compareAttack={enemyStats?.attack}
                      compareMeleeArmor={enemyStats?.meleeArmor}
                      compareRangedArmor={enemyStats?.rangedArmor}
                      compareSpeed={enemyStats?.speed}
                      compareAttackSpeed={enemyStats?.attackSpeed}
                      compareMaxRange={enemyStats?.maxRange}
                      bonusDamage={alignedAllyBonuses}
                      compareBonusDamage={alignedEnemyBonuses}
                      maxBonusDamageLines={maxBonusDamageLines}
                      compareCost={enemyStats?.cost}
                    />
                  </div>
                </div>
              )}
            </motion.div>
            {/* Enemy Unit */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4 justify-center"
            >
              {unit2 && (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 flex justify-start">
                    <UnitCard
                      className="w-[280px]"
                      variation={modifiedVariationEnemy}
                      unit={modifiedUnit2}
                      side="right"
                      isSelected={true}
                      compareHp={allyStats?.hp}
                      compareAttack={allyStats?.attack}
                      compareMeleeArmor={allyStats?.meleeArmor}
                      compareRangedArmor={allyStats?.rangedArmor}
                      compareSpeed={allyStats?.speed}
                      compareAttackSpeed={allyStats?.attackSpeed}
                      compareMaxRange={allyStats?.maxRange}
                      bonusDamage={alignedEnemyBonuses}
                      compareBonusDamage={alignedAllyBonuses}
                      maxBonusDamageLines={maxBonusDamageLines}
                      compareCost={allyStats?.cost}
                    />
                  </div>
                  <div className="flex-shrink-0 space-y-3">
                    <AgeSelector
                      availableAges={getAvailableAges(unit2.id, selectedCivEnemy)}
                      selectedAge={selectedAgeEnemy}
                      onAgeChange={setSelectedAgeEnemy}
                      orientation="right"
                    />
                    <TechnologySelector
                      technologies={techsEnemy}
                      activeTechnologies={activeTechnologiesEnemy}
                      orientation="right"
                      onToggle={(techId) => {
                        handleTieredTechnologyToggle(techId, activeTechnologiesEnemy, setActiveTechnologiesEnemy);
                      }}
                    />
                    <AbilitySelector
                      abilities={abilitiesEnemy}
                      activeAbilities={activeAbilitiesEnemy}
                      onToggle={(abilityId) => {
                        const newSet = new Set(activeAbilitiesEnemy);
                        if (newSet.has(abilityId)) {
                          newSet.delete(abilityId);
                        } else {
                          newSet.add(abilityId);
                        }
                        setActiveAbilitiesEnemy(newSet);
                      }}
                      orientation="right"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
        {isVersus && (
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {(() => {
              if (!unit1 || !unit2) return null;
              
              let versusData;
              let multipliers = undefined;
              
              // Convertir les Sets en tableaux pour passer aux fonctions de combat
              const abilitiesArrayAlly = Array.from(activeAbilitiesAlly);
              const abilitiesArrayEnemy = Array.from(activeAbilitiesEnemy);
              
              if (atEqualCost) {
                const result = computeVersusAtEqualCost(
                  modifiedVariationAlly || modifiedUnit1!, 
                  modifiedVariationEnemy || modifiedUnit2!,
                  abilitiesArrayAlly,
                  abilitiesArrayEnemy
                );
                versusData = result;
                multipliers = result.multipliers;
              } else {
                versusData = computeVersus(
                  modifiedVariationAlly || modifiedUnit1!, 
                  modifiedVariationEnemy || modifiedUnit2!,
                  abilitiesArrayAlly,
                  abilitiesArrayEnemy
                );
              }
              
              const isDraw = versusData.winner === 'draw';
              // Comparer avec le nom pour distinguer les unités identiques (gauche = attacker, droite = defender)
              const leftIsWinner = !isDraw && versusData.winner === versusData.attacker.id && versusData.attacker.timeToKill !== null && versusData.defender.timeToKill !== null && versusData.attacker.timeToKill < versusData.defender.timeToKill;
              const rightIsWinner = !isDraw && versusData.winner === versusData.defender.id && versusData.attacker.timeToKill !== null && versusData.defender.timeToKill !== null && versusData.defender.timeToKill < versusData.attacker.timeToKill;
              const leftMetrics = {
                dps: versusData.attacker.dps,
                dpsPerCost: versusData.attacker.dpsPerCost,
                hitsToKill: versusData.attacker.hitsToKill,
                timeToKill: versusData.attacker.timeToKill,
                effectiveDamagePerHit: versusData.attacker.effectiveDamagePerHit,
                bugAttackSpeed: versusData.attacker.bugAttackSpeed,
                formula: versusData.attacker.formula,
                isWinner: leftIsWinner,
                isLoser: !leftIsWinner && !isDraw,
                isDraw,
                opponentClasses: (modifiedVariationEnemy || modifiedUnit2)?.classes ?? unit2?.classes ?? [],
                opponentDps: versusData.defender.dps,
                opponentDpsPerCost: versusData.defender.dpsPerCost,
                opponentHitsToKill: versusData.defender.hitsToKill,
                opponentTimeToKill: versusData.defender.timeToKill,
                multiplier: multipliers?.multA,
                totalCost: multipliers?.totalCostA,
                opponentMultiplier: multipliers?.multB,
                opponentTotalCost: multipliers?.totalCostB,
                winnerHpRemaining: leftIsWinner ? versusData.winnerHpRemaining : undefined,
                winnerUnitsRemaining: leftIsWinner ? versusData.winnerUnitsRemaining : undefined,
                resourceDifference: leftIsWinner ? versusData.resourceDifference : undefined
              };
              const rightMetrics = {
                dps: versusData.defender.dps,
                dpsPerCost: versusData.defender.dpsPerCost,
                hitsToKill: versusData.defender.hitsToKill,
                timeToKill: versusData.defender.timeToKill,
                effectiveDamagePerHit: versusData.defender.effectiveDamagePerHit,
                bugAttackSpeed: versusData.defender.bugAttackSpeed,
                formula: versusData.defender.formula,
                isWinner: rightIsWinner,
                isLoser: !rightIsWinner && !isDraw,
                isDraw,
                opponentClasses: (modifiedVariationAlly || modifiedUnit1)?.classes ?? unit1?.classes ?? [],
                opponentDps: versusData.attacker.dps,
                opponentDpsPerCost: versusData.attacker.dpsPerCost,
                opponentHitsToKill: versusData.attacker.hitsToKill,
                opponentTimeToKill: versusData.attacker.timeToKill,
                multiplier: multipliers?.multB,
                totalCost: multipliers?.totalCostB,
                opponentMultiplier: multipliers?.multA,
                opponentTotalCost: multipliers?.totalCostA,
                winnerHpRemaining: rightIsWinner ? versusData.winnerHpRemaining : undefined,
                winnerUnitsRemaining: rightIsWinner ? versusData.winnerUnitsRemaining : undefined,
                resourceDifference: rightIsWinner ? versusData.resourceDifference : undefined
              };
              return (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-4 justify-center"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 space-y-3">
                        <AgeSelector
                          availableAges={getAvailableAges(unit1.id, selectedCivAlly)}
                          selectedAge={selectedAgeAlly}
                          onAgeChange={setSelectedAgeAlly}
                          orientation="left"
                        />
                        <TechnologySelector
                          technologies={techsAlly}
                          activeTechnologies={activeTechnologiesAlly}
                          onToggle={(techId) => {
                            handleTieredTechnologyToggle(techId, activeTechnologiesAlly, setActiveTechnologiesAlly);
                          }}
                          orientation="left"
                        />
                        <AbilitySelector
                          abilities={abilitiesAlly}
                          activeAbilities={activeAbilitiesAlly}
                          onToggle={(abilityId) => {
                            const newSet = new Set(activeAbilitiesAlly);
                            if (newSet.has(abilityId)) {
                              newSet.delete(abilityId);
                            } else {
                              newSet.add(abilityId);
                            }
                            setActiveAbilitiesAlly(newSet);
                          }}
                          orientation="left"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <UnitCard
                          className="w-[280px]"
                          variation={modifiedVariationAlly}
                          unit={modifiedUnit1}
                          side="left"
                          mode="versus"
                          versusMetrics={leftMetrics}
                        />
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-4 justify-center"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <UnitCard
                          className="w-[280px]"
                          variation={modifiedVariationEnemy}
                          unit={modifiedUnit2}
                          side="right"
                          mode="versus"
                          versusMetrics={rightMetrics}
                        />
                      </div>
                      <div className="flex-shrink-0 space-y-3">
                        <AgeSelector
                          availableAges={getAvailableAges(unit2.id, selectedCivEnemy)}
                          selectedAge={selectedAgeEnemy}
                          onAgeChange={setSelectedAgeEnemy}
                          orientation="right"
                        />
                        <TechnologySelector
                          technologies={techsEnemy}
                          activeTechnologies={activeTechnologiesEnemy}
                          onToggle={(techId) => {
                            handleTieredTechnologyToggle(techId, activeTechnologiesEnemy, setActiveTechnologiesEnemy);
                          }}
                          orientation="right"
                        />
                        <AbilitySelector
                          abilities={abilitiesEnemy}
                          activeAbilities={activeAbilitiesEnemy}
                          onToggle={(abilityId) => {
                            const newSet = new Set(activeAbilitiesEnemy);
                            if (newSet.has(abilityId)) {
                              newSet.delete(abilityId);
                            } else {
                              newSet.add(abilityId);
                            }
                            setActiveAbilitiesEnemy(newSet);
                          }}
                          orientation="right"
                        />
                      </div>
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="secondary" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Sandbox;
