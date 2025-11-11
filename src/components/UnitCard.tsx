import { AoE4Unit, getPrimaryWeapon, getArmorValue, getTotalCost, getTotalCostFromVariation } from "@/data/unified-units";
import type { UnifiedVariation } from "@/data/unified-units";
import { Card } from "@/components/ui/card";

interface UnitCardProps {
  unit?: AoE4Unit;
  variation?: UnifiedVariation;
  side?: "left" | "right";
  onClick?: () => void;
  className?: string;
  isSelected?: boolean;
  // Stats de comparaison (unité adverse)
  compareHp?: number;
  compareAttack?: number;
  compareMeleeArmor?: number;
  compareRangedArmor?: number;
  compareSpeed?: number;
  compareAttackSpeed?: number;
  compareMaxRange?: number;
  bonusDamage?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  compareBonusDamage?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  maxBonusDamageLines?: number; // Nombre maximum de lignes de bonus pour l'alignement
  compareCost?: number;
}

export const UnitCard = ({ 
  unit, 
  variation, 
  side = "left", 
  onClick, 
  className,
  isSelected = false,
  compareHp,
  compareAttack,
  compareMeleeArmor,
  compareRangedArmor,
  compareSpeed,
  compareAttackSpeed,
  compareMaxRange,
  bonusDamage,
  compareBonusDamage,
  maxBonusDamageLines,
  compareCost
}: UnitCardProps) => {
  // Utiliser la variation si disponible, sinon l'unité de base
  const displayData = variation || unit;
  if (!displayData) return null;
  
  const primaryWeapon = getPrimaryWeapon(displayData);
  const meleeArmor = getArmorValue(displayData, "melee");
  const rangedArmor = getArmorValue(displayData, "ranged");
  const totalCost = variation ? getTotalCostFromVariation(variation) : (unit ? getTotalCost(unit) : 0);
  
  // Pour les coûts et infos spécifiques
  const costs = variation ? variation.costs : unit!.costs;
  const hitpoints = displayData.hitpoints;
  const icon = displayData.icon;
  const name = displayData.name;
  const isUnique = displayData.unique;
  const civs = displayData.civs;
  const movement = 'movement' in displayData ? displayData.movement : undefined;
  
  // Fonction pour obtenir la classe de couleur selon la comparaison
  const getComparisonColor = (myValue: number, compareValue?: number, higherIsBetter: boolean = true, minDiff: number = 0.05, isAbsoluteThreshold: boolean = false) => {
    if (compareValue === undefined) return { color: "", symbol: "" };
    
    const diff = myValue - compareValue;
    const threshold = isAbsoluteThreshold ? minDiff : compareValue * minDiff;
    
    if (Math.abs(diff) <= threshold) return { color: "", symbol: "" }; // Différence négligeable
    
    const isBetter = higherIsBetter ? diff > 0 : diff < 0;
    return {
      color: isBetter ? "text-green-500" : "text-orange-400",
      symbol: isBetter ? "△" : "▽"
    };
  };
  
  // Déterminer le label pour oliveoil selon la civilisation
  const getOliveoilLabel = () => {
    if (civs.includes('mac')) {
      return '🪙 Silver:';
    }
    return '🫒 Olive Oil:';
  };

  return (
    <Card
      className={`p-6 border-2 border-border bg-card cursor-pointer hover:border-primary transition-all duration-300 group ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Image réelle au lieu d'emoji */}
        <div className="w-20 h-20 flex items-center justify-center">
          <img 
            src={icon} 
            alt={name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback si l'image ne charge pas
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23ccc"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">?</text></svg>';
            }}
          />
        </div>
        
        <div className="flex flex-col items-center justify-center gap-1">
          <h3 className={`text-xl font-serif text-foreground text-center transition-colors ${
            isSelected 
              ? 'font-bold' 
              : 'font-semibold group-hover:text-black'
          }`}>
            {name}
          </h3>
          {displayData.displayClasses && displayData.displayClasses.length > 0 && (
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground text-center">
                {displayData.displayClasses[0]}
              </p>
              {isUnique && (
                <span className="text-xs text-yellow-500">★</span>
              )}
            </div>
          )}
        </div>
        
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">HP:</span>
            <span className={`font-medium flex items-center gap-1 ${getComparisonColor(hitpoints, compareHp).color}`}>
              {getComparisonColor(hitpoints, compareHp).symbol && (
                <span className="text-xs">{getComparisonColor(hitpoints, compareHp).symbol}</span>
              )}
              {Math.round(hitpoints)}
            </span>
          </div>
          
          {primaryWeapon && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attack:</span>
              <span className={`flex items-center gap-1 ${getComparisonColor(primaryWeapon.damage, compareAttack).color}`}>
                {getComparisonColor(primaryWeapon.damage, compareAttack).symbol && (
                  <span className="text-xs">{getComparisonColor(primaryWeapon.damage, compareAttack).symbol}</span>
                )}
                {Math.round(primaryWeapon.damage)} ({primaryWeapon.type})
              </span>
            </div>
          )}
          
          {(bonusDamage && bonusDamage.length > 0) || maxBonusDamageLines > 0 ? (
            <div className="pl-4 space-y-1">
              {bonusDamage && bonusDamage.map((modifier: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                // Si c'est un bonus caché (pour l'alignement), afficher une ligne vide
                if (modifier.hidden) {
                  return (
                    <div key={idx} className="flex justify-between text-xs h-4">
                      <span className="text-transparent">-</span>
                    </div>
                  );
                }
                
                const targetClasses = modifier.target?.class?.flat() || [];
                const targetName = targetClasses.join(' ') || 'Unknown';
                
                // Trouver le bonus correspondant dans l'unité adverse (à la même position pour l'alignement)
                const compareModifier = compareBonusDamage?.[idx];
                
                // Vérifier si c'est le même type de bonus (même cible)
                let comparison = { color: "", symbol: "" };
                if (compareModifier && !compareModifier.hidden) {
                  const compareClasses = compareModifier.target?.class?.flat() || [];
                  const isSameTarget = compareClasses.join(' ') === targetClasses.join(' ');
                  
                  // Afficher la comparaison seulement si c'est le même bonus
                  if (isSameTarget) {
                    comparison = getComparisonColor(modifier.value, compareModifier.value);
                  }
                }
                
                return (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className={`flex items-center gap-1 ${comparison.color}`}>
                      {comparison.symbol && (
                        <span className="text-xs">{comparison.symbol}</span>
                      )}
                      <span className="text-muted-foreground">+{modifier.value} vs</span>
                    </span>
                    <span className="text-foreground capitalize">{targetName}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
          
          {primaryWeapon && primaryWeapon.range && (
            <div className="pl-4 flex justify-between text-xs">
              <span className="text-muted-foreground">Range:</span>
              <span className="flex items-center gap-1">
                {getComparisonColor(primaryWeapon.range.max, compareMaxRange, true, 0.5, true).symbol && (
                  <span className={`text-xs ${getComparisonColor(primaryWeapon.range.max, compareMaxRange, true, 0.5, true).color}`}>
                    {getComparisonColor(primaryWeapon.range.max, compareMaxRange, true, 0.5, true).symbol}
                  </span>
                )}
                <span className="text-foreground">
                  {primaryWeapon.range.min} - <span className={getComparisonColor(primaryWeapon.range.max, compareMaxRange, true, 0.5, true).color}>{primaryWeapon.range.max}</span>
                </span>
              </span>
            </div>
          )}
          
          {primaryWeapon && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attack Speed:</span>
              <span className={`flex items-center gap-1 ${getComparisonColor(primaryWeapon.speed, compareAttackSpeed, false).color}`}>
                {getComparisonColor(primaryWeapon.speed, compareAttackSpeed, false).symbol && (
                  <span className="text-xs">{getComparisonColor(primaryWeapon.speed, compareAttackSpeed, false).symbol}</span>
                )}
                {primaryWeapon.speed.toFixed(2)}s
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Melee Armor:</span>
            <span className={`flex items-center gap-1 ${getComparisonColor(meleeArmor, compareMeleeArmor).color}`}>
              {getComparisonColor(meleeArmor, compareMeleeArmor).symbol && (
                <span className="text-xs">{getComparisonColor(meleeArmor, compareMeleeArmor).symbol}</span>
              )}
              {Math.round(meleeArmor)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ranged Armor:</span>
            <span className={`flex items-center gap-1 ${getComparisonColor(rangedArmor, compareRangedArmor).color}`}>
              {getComparisonColor(rangedArmor, compareRangedArmor).symbol && (
                <span className="text-xs">{getComparisonColor(rangedArmor, compareRangedArmor).symbol}</span>
              )}
              {Math.round(rangedArmor)}
            </span>
          </div>
          
          {movement && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed:</span>
              <span className={`flex items-center gap-1 ${getComparisonColor(movement.speed, compareSpeed).color}`}>
                {getComparisonColor(movement.speed, compareSpeed).symbol && (
                  <span className="text-xs">{getComparisonColor(movement.speed, compareSpeed).symbol}</span>
                )}
                {movement.speed.toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="border-t border-border my-2"></div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cost:</span>
            <span className={`font-medium flex items-center gap-1 ${getComparisonColor(totalCost, compareCost, false).color}`}>
              {getComparisonColor(totalCost, compareCost, false).symbol && (
                <span className="text-xs">{getComparisonColor(totalCost, compareCost, false).symbol}</span>
              )}
              {Math.round(totalCost)}
            </span>
          </div>
          
          {costs.food > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <img src="/resources/food.png" alt="Food" className="w-4 h-4" />
                Food:
              </span>
              <span className="text-foreground">{Math.round(costs.food)}</span>
            </div>
          )}
          
          {costs.wood > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <img src="/resources/wood.png" alt="Wood" className="w-4 h-4" />
                Wood:
              </span>
              <span className="text-foreground">{Math.round(costs.wood)}</span>
            </div>
          )}
          
          {costs.gold > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <img src="/resources/gold.png" alt="Gold" className="w-4 h-4" />
                Gold:
              </span>
              <span className="text-foreground">{Math.round(costs.gold)}</span>
            </div>
          )}
          
          {costs.stone > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <img src="/resources/stone.png" alt="Stone" className="w-4 h-4" />
                Stone:
              </span>
              <span className="text-foreground">{Math.round(costs.stone)}</span>
            </div>
          )}
          
          {(costs.oliveoil ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <img 
                  src={civs.includes('mac') ? "/resources/silver.png" : "/resources/oliveoil.png"} 
                  alt={civs.includes('mac') ? "Silver" : "Olive Oil"} 
                  className="w-4 h-4" 
                />
                {civs.includes('mac') ? 'Silver:' : 'Olive Oil:'}
              </span>
              <span className="text-foreground">{Math.round(costs.oliveoil ?? 0)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
