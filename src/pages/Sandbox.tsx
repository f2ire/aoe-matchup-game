import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { aoe4Units, AoE4Unit } from "@/data/units-new";
import { CIVILIZATIONS, Civilization } from "@/data/civilizations";
import { UnitCard } from "@/components/UnitCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { motion } from "framer-motion";

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
  
  // Protection contre tableau vide
  const [unit1, setUnit1] = useState<AoE4Unit>(aoe4Units[0] || null);
  const [unit2, setUnit2] = useState<AoE4Unit>(aoe4Units[1] || null);
  
  // Réinitialiser l'unité alliée si elle n'est plus dans la liste filtrée
  useMemo(() => {
    if (unit1 && !filteredUnitsAlly.find(u => u.id === unit1.id)) {
      setUnit1(filteredUnitsAlly[0] || aoe4Units[0]);
    }
  }, [filteredUnitsAlly, unit1]);
  
  // Réinitialiser l'unité ennemie si elle n'est plus dans la liste filtrée
  useMemo(() => {
    if (unit2 && !filteredUnitsEnemy.find(u => u.id === unit2.id)) {
      setUnit2(filteredUnitsEnemy[0] || aoe4Units[0]);
    }
  }, [filteredUnitsEnemy, unit2]);

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

  if (!unit1 || !unit2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement des unités...</p>
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
            Compare any two units from any civilizations - All {aoe4Units.length} units available!
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
                <SelectItem value="all" className="text-foreground py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl">?</span>
                    </div>
                    <span className="font-medium">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="text-foreground py-3">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium">{civ.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium text-foreground mt-6 block">Friendly Unit:</label>
            <Select value={unit1.id} onValueChange={(id) => setUnit1(filteredUnitsAlly.find(u => u.id === id)!)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
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
                        className="cursor-pointer hover:bg-accent px-2 py-2 rounded"
                      >
                        <SelectLabel className="text-primary font-semibold flex items-center gap-2 cursor-pointer">
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
                        <SelectItem key={unit.id} value={unit.id} className="text-foreground pl-8">
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
                <SelectItem value="all" className="text-foreground py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                      <span className="text-xl">?</span>
                    </div>
                    <span className="font-medium">All Civilizations</span>
                  </div>
                </SelectItem>
                {CIVILIZATIONS.map((civ) => (
                  <SelectItem key={civ.abbr} value={civ.abbr} className="text-foreground py-3">
                    <div className="flex items-center gap-3">
                      <img src={civ.flagPath} alt={civ.name} className="w-8 h-8 object-contain" />
                      <span className="font-medium">{civ.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium text-foreground mt-6 block">Enemy Unit:</label>
            <Select value={unit2.id} onValueChange={(id) => setUnit2(filteredUnitsEnemy.find(u => u.id === id)!)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
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
                        className="cursor-pointer hover:bg-accent px-2 py-2 rounded"
                      >
                        <SelectLabel className="text-primary font-semibold flex items-center gap-2 cursor-pointer">
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
                        <SelectItem key={unit.id} value={unit.id} className="text-foreground pl-8">
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
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UnitCard unit={unit1} side="left" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UnitCard unit={unit2} side="right" />
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
