import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aoe4Units, AoE4Unit, getUnitVariation, getAvailableAges, getMaxAge, getPrimaryWeapon, getArmorValue, getTotalCost, getTotalCostFromVariation } from "@/data/unified-units";
import type { UnifiedVariation } from "@/data/unified-units";
import { getTechnologiesForUnit, getActiveTechnologyVariationsWithTiers, applyTechnologyEffects, getAllTiersFromSameLine, allTechnologies, type UnitStats } from "@/data/unified-technologies";
import { CIVILIZATIONS, Civilization } from "@/data/civilizations";
import { UnitCard } from "@/components/UnitCard";
import { AgeSelector } from "@/components/AgeSelector";
import { TechnologySelector } from "@/components/TechnologySelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { motion } from "framer-motion";

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
  
  // Calculer les stats modifiées avec useMemo pour forcer le recalcul complet à chaque changement
  const modifiedAllyStats = useMemo(() => {
    const allyData = variationAlly || unit1;
    if (!allyData) return {
      hitpoints: 0,
      meleeAttack: 0,
      rangedAttack: 0,
      meleeArmor: 0,
      rangedArmor: 0,
      moveSpeed: 0
    };
    
    const allyWeapon = getPrimaryWeapon(allyData);
    
    // Stats de base (toujours recalculées depuis la source)
    const baseStats: UnitStats = {
      hitpoints: allyData.hitpoints,
      meleeAttack: allyWeapon?.type === 'melee' ? (allyWeapon.damage || 0) : 0,
      rangedAttack: allyWeapon?.type === 'ranged' ? (allyWeapon.damage || 0) : 0,
      meleeArmor: getArmorValue(allyData, "melee"),
      rangedArmor: getArmorValue(allyData, "ranged"),
      moveSpeed: 'movement' in allyData ? allyData.movement?.speed || 0 : 0
    };
    
    // Obtenir les variations des technologies actives (incluant les paliers précédents automatiquement)
    const techVariations = getActiveTechnologyVariationsWithTiers(
      activeTechnologiesAlly,
      selectedCivAlly,
      selectedAgeAlly
    );
    
    // Appliquer les technologies depuis zéro
    return applyTechnologyEffects(baseStats, unit1?.classes || [], techVariations, unit1?.id);
  }, [unit1, variationAlly, activeTechnologiesAlly, selectedCivAlly, selectedAgeAlly]);
  
  const modifiedEnemyStats = useMemo(() => {
    const enemyData = variationEnemy || unit2;
    if (!enemyData) return {
      hitpoints: 0,
      meleeAttack: 0,
      rangedAttack: 0,
      meleeArmor: 0,
      rangedArmor: 0,
      moveSpeed: 0
    };
    
    const enemyWeapon = getPrimaryWeapon(enemyData);
    
    // Stats de base (toujours recalculées depuis la source)
    const baseStats: UnitStats = {
      hitpoints: enemyData.hitpoints,
      meleeAttack: enemyWeapon?.type === 'melee' ? (enemyWeapon.damage || 0) : 0,
      rangedAttack: enemyWeapon?.type === 'ranged' ? (enemyWeapon.damage || 0) : 0,
      meleeArmor: getArmorValue(enemyData, "melee"),
      rangedArmor: getArmorValue(enemyData, "ranged"),
      moveSpeed: 'movement' in enemyData ? enemyData.movement?.speed || 0 : 0
    };
    
    // Obtenir les variations des technologies actives (incluant les paliers précédents automatiquement)
    const techVariations = getActiveTechnologyVariationsWithTiers(
      activeTechnologiesEnemy,
      selectedCivEnemy,
      selectedAgeEnemy
    );
    
    // Appliquer les technologies depuis zéro
    return applyTechnologyEffects(baseStats, unit2?.classes || [], techVariations, unit2?.id);
  }, [unit2, variationEnemy, activeTechnologiesEnemy, selectedCivEnemy, selectedAgeEnemy]);
  
  // Calculer les stats pour la comparaison
  const allyData = variationAlly || unit1;
  const enemyData = variationEnemy || unit2;
  
  // Créer des variations modifiées avec les technologies appliquées
  const modifiedVariationAlly = variationAlly ? {
    ...variationAlly,
    hitpoints: modifiedAllyStats.hitpoints,
    weapons: variationAlly.weapons.map(weapon => ({
      ...weapon,
      damage: weapon.type === 'melee' ? modifiedAllyStats.meleeAttack : modifiedAllyStats.rangedAttack
    })),
    armor: [
      { type: 'melee', value: modifiedAllyStats.meleeArmor },
      { type: 'ranged', value: modifiedAllyStats.rangedArmor }
    ],
    movement: variationAlly.movement ? {
      ...variationAlly.movement,
      speed: modifiedAllyStats.moveSpeed
    } : undefined
  } : undefined;
  
  const modifiedVariationEnemy = variationEnemy ? {
    ...variationEnemy,
    hitpoints: modifiedEnemyStats.hitpoints,
    weapons: variationEnemy.weapons.map(weapon => ({
      ...weapon,
      damage: weapon.type === 'melee' ? modifiedEnemyStats.meleeAttack : modifiedEnemyStats.rangedAttack
    })),
    armor: [
      { type: 'melee', value: modifiedEnemyStats.meleeArmor },
      { type: 'ranged', value: modifiedEnemyStats.rangedArmor }
    ],
    movement: variationEnemy.movement ? {
      ...variationEnemy.movement,
      speed: modifiedEnemyStats.moveSpeed
    } : undefined
  } : undefined;
  
  const modifiedUnit1 = unit1 && !variationAlly ? {
    ...unit1,
    hitpoints: modifiedAllyStats.hitpoints,
    weapons: unit1.weapons.map(weapon => ({
      ...weapon,
      damage: weapon.type === 'melee' ? modifiedAllyStats.meleeAttack : modifiedAllyStats.rangedAttack
    })),
    armor: [
      { type: 'melee', value: modifiedAllyStats.meleeArmor },
      { type: 'ranged', value: modifiedAllyStats.rangedArmor }
    ],
    movement: unit1.movement ? {
      ...unit1.movement,
      speed: modifiedAllyStats.moveSpeed
    } : undefined
  } : undefined;
  
  const modifiedUnit2 = unit2 && !variationEnemy ? {
    ...unit2,
    hitpoints: modifiedEnemyStats.hitpoints,
    weapons: unit2.weapons.map(weapon => ({
      ...weapon,
      damage: weapon.type === 'melee' ? modifiedEnemyStats.meleeAttack : modifiedEnemyStats.rangedAttack
    })),
    armor: [
      { type: 'melee', value: modifiedEnemyStats.meleeArmor },
      { type: 'ranged', value: modifiedEnemyStats.rangedArmor }
    ],
    movement: unit2.movement ? {
      ...unit2.movement,
      speed: modifiedEnemyStats.moveSpeed
    } : undefined
  } : undefined;
  
  // Stats finales avec coûts
  const allyStats = allyData ? {
    hp: modifiedAllyStats.hitpoints,
    attack: Math.max(modifiedAllyStats.meleeAttack, modifiedAllyStats.rangedAttack),
    meleeArmor: modifiedAllyStats.meleeArmor,
    rangedArmor: modifiedAllyStats.rangedArmor,
    speed: modifiedAllyStats.moveSpeed,
    cost: variationAlly ? getTotalCostFromVariation(variationAlly) : (unit1 ? getTotalCost(unit1) : 0),
    costs: variationAlly ? variationAlly.costs : (unit1 ? unit1.costs : undefined)
  } : null;
  
  const enemyStats = enemyData ? {
    hp: modifiedEnemyStats.hitpoints,
    attack: Math.max(modifiedEnemyStats.meleeAttack, modifiedEnemyStats.rangedAttack),
    meleeArmor: modifiedEnemyStats.meleeArmor,
    rangedArmor: modifiedEnemyStats.rangedArmor,
    speed: modifiedEnemyStats.moveSpeed,
    cost: variationEnemy ? getTotalCostFromVariation(variationEnemy) : (unit2 ? getTotalCost(unit2) : 0),
    costs: variationEnemy ? variationEnemy.costs : (unit2 ? unit2.costs : undefined)
  } : null;


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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Sandbox Mode</h1>
          <p className="text-muted-foreground text-lg">
            Compare any two units from any civilizations !
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Colonne Alliée */}
          <div className="space-y-4">
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
                <SelectItem value="all" className="data-[state=checked]:text-primary-foreground py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl">?</span>
                    </div>
                    <span className="font-medium">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="data-[state=checked]:text-primary-foreground py-3">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium">{civ.name}</span>
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
                        <SelectItem key={unit.id} value={unit.id} className="data-[state=checked]:text-primary-foreground pl-8">
                          <div className="flex items-center gap-2">
                            <img src={unit.icon} alt={unit.name} className="w-6 h-6 object-contain" />
                            <span>{unit.name}</span>
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
          <div className="space-y-4">
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
                <SelectItem value="all" className="data-[state=checked]:text-primary-foreground py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl">?</span>
                    </div>
                    <span className="font-medium">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="data-[state=checked]:text-primary-foreground py-3">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium">{civ.name}</span>
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
                        <SelectItem key={unit.id} value={unit.id} className="data-[state=checked]:text-primary-foreground pl-8">
                          <div className="flex items-center gap-2">
                            <img src={unit.icon} alt={unit.name} className="w-6 h-6 object-contain" />
                            <span>{unit.name}</span>
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

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Ally Unit avec sélecteur d'âge à gauche */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4"
          >
            {unit1 && (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 space-y-3">
                    <AgeSelector
                      availableAges={getAvailableAges(
                        unit1.id,
                        selectedCivAlly
                      )}
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
                  </div>
                  <div className="flex-1">
                    <UnitCard 
                      variation={modifiedVariationAlly}
                      unit={modifiedUnit1}
                      side="left"
                      compareHp={enemyStats?.hp}
                      compareAttack={enemyStats?.attack}
                      compareMeleeArmor={enemyStats?.meleeArmor}
                      compareRangedArmor={enemyStats?.rangedArmor}
                      compareSpeed={enemyStats?.speed}
                      compareCost={enemyStats?.cost}
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Enemy Unit avec sélecteur d'âge à droite */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4"
          >
            {unit2 && (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <UnitCard 
                      variation={modifiedVariationEnemy}
                      unit={modifiedUnit2}
                      side="right"
                      compareHp={allyStats?.hp}
                      compareAttack={allyStats?.attack}
                      compareMeleeArmor={allyStats?.meleeArmor}
                      compareRangedArmor={allyStats?.rangedArmor}
                      compareSpeed={allyStats?.speed}
                      compareCost={allyStats?.cost}
                    />
                  </div>
                  <div className="flex-shrink-0 space-y-3">
                    <AgeSelector
                      availableAges={getAvailableAges(
                        unit2.id,
                        selectedCivEnemy
                      )}
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
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>

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
