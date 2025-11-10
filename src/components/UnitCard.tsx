import { AoE4Unit, getPrimaryWeapon, getArmorValue, getTotalCost, getTotalCostFromVariation } from "@/data/unified-units";
import type { UnifiedVariation } from "@/data/unified-units";
import { Card } from "@/components/ui/card";

interface UnitCardProps {
  unit?: AoE4Unit;
  variation?: UnifiedVariation;
  side?: "left" | "right";
  onClick?: () => void;
  className?: string;
  // Stats de comparaison (unité adverse)
  compareHp?: number;
  compareAttack?: number;
  compareMeleeArmor?: number;
  compareRangedArmor?: number;
  compareSpeed?: number;
  compareCost?: number;
}

export const UnitCard = ({ 
  unit, 
  variation, 
  side = "left", 
  onClick, 
  className,
  compareHp,
  compareAttack,
  compareMeleeArmor,
  compareRangedArmor,
  compareSpeed,
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
  const getComparisonColor = (myValue: number, compareValue?: number, higherIsBetter: boolean = true) => {
    if (compareValue === undefined) return { color: "", symbol: "" };
    
    const threshold = compareValue * 0.05; // 5% de différence
    const diff = myValue - compareValue;
    
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
      className={`p-6 border-2 border-border bg-card cursor-pointer hover:border-primary transition-all duration-300 ${className}`}
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
        
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-xl font-serif font-semibold text-foreground text-center">{name}</h3>
          {isUnique && (
            <span className="text-xs text-yellow-500">★</span>
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
