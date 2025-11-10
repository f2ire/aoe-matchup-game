import { Technology, categorizeTechnology } from "@/data/unified-technologies";

interface TechnologySelectorProps {
  technologies: Technology[];
  activeTechnologies: Set<string>;
  onToggle: (techId: string) => void;
  orientation?: "left" | "right";
}

export const TechnologySelector = ({
  technologies,
  activeTechnologies,
  onToggle,
  orientation = "left"
}: TechnologySelectorProps) => {
  if (technologies.length === 0) return null;

  // Grouper les technologies par catégorie ET par âge
  const categories = [
    'HP', 
    'HP-Unique',
    'Attack-Melee', 'Attack-Ranged', 
    'Attack-Melee-Unique', 'Attack-Ranged-Unique',
    'Armor-Melee', 'Armor-Ranged', 
    'Armor-Melee-Unique', 'Armor-Ranged-Unique',
    'Speed', 
    'Speed-Unique',
    'Other'
  ];
  const categoryLabels: Record<string, string> = {
    'HP': 'HP',
    'Attack-Melee': 'ATK',
    'Attack-Ranged': 'ATK',
    'Armor-Melee': 'ARM',
    'Armor-Ranged': 'ARM',
    'Speed': 'SPD',
    'HP-Unique': 'HP',
    'Attack-Melee-Unique': 'ATK',
    'Attack-Ranged-Unique': 'ATK',
    'Armor-Melee-Unique': 'ARM',
    'Armor-Ranged-Unique': 'ARM',
    'Speed-Unique': 'SPD',
    'Other': 'Other'
  };

  // Structure: category -> age -> technologies[]
  const grouped: Record<string, Record<number, Technology[]>> = {};
  
  categories.forEach(cat => {
    grouped[cat] = { 1: [], 2: [], 3: [], 4: [] };
  });

  technologies.forEach(tech => {
    const category = categorizeTechnology(tech);
    const age = tech.minAge;
    
    if (age >= 1 && age <= 4 && grouped[category]) {
      grouped[category][age].push(tech);
    }
  });

  const ages = [1, 2, 3, 4];
  
  // Tracker pour savoir quelle est la première ligne de chaque groupe (HP, ATK, ARM, SPD)
  const firstLineOfGroup = new Map<string, string>();
  
  // Pré-calculer quelle est la première ligne visible de chaque groupe
  categories.forEach(category => {
    const categoryTechs = grouped[category];
    const hasAnyTech = ages.some(age => categoryTechs[age].length > 0);
    if (!hasAnyTech) return;
    
    const baseLabel = categoryLabels[category];
    if (!firstLineOfGroup.has(baseLabel)) {
      firstLineOfGroup.set(baseLabel, category);
    }
  });
  
  return (
    <div className="space-y-2 mt-2">
      {categories.map(category => {
        const categoryTechs = grouped[category];
        // Vérifier si cette catégorie a des technologies
        const hasAnyTech = ages.some(age => categoryTechs[age].length > 0);
        if (!hasAnyTech) return null;

        const techGrid = (
          <div className="flex gap-2">
            {ages.map(age => {
              const techs = categoryTechs[age];
              
              return (
                <div key={age} className="w-12 flex flex-col gap-2">
                  {techs.map(tech => {
                    const isActive = activeTechnologies.has(tech.id);
                    const iconFileName = tech.icon.split('/').pop() || '';
                    const iconPath = `/technologies/${iconFileName}`;

                    return (
                      <button
                        key={tech.id}
                        onClick={() => onToggle(tech.id)}
                        title={tech.name}
                        className={`
                          w-12 h-12 rounded border-2 transition-all
                          hover:scale-105 active:scale-95 overflow-hidden
                          ${isActive 
                            ? 'border-green-500 bg-green-500/10' 
                            : 'border-border/50 bg-secondary/50 opacity-60'
                          }
                        `}
                      >
                        <img 
                          src={iconPath}
                          alt={tech.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23666"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="24" fill="white">?</text></svg>';
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );

        // Afficher le label seulement sur la première ligne de chaque groupe
        const baseLabel = categoryLabels[category];
        const isFirstLineOfGroup = firstLineOfGroup.get(baseLabel) === category;

        const label = (
          <div className="text-xs font-medium text-muted-foreground w-10 flex-shrink-0 pt-2">
            {isFirstLineOfGroup ? `${baseLabel}:` : ''}
          </div>
        );

        return (
          <div key={category} className="flex items-start gap-2">
            {orientation === "left" ? (
              <>
                {label}
                {techGrid}
              </>
            ) : (
              <>
                {techGrid}
                {label}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
