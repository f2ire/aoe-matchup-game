import { AoE4Unit, getPrimaryWeapon, getArmorValue, getTotalCost } from "@/data/units-new";
import { Card } from "@/components/ui/card";

interface UnitCardProps {
  unit: AoE4Unit;
  side?: "left" | "right";
  onClick?: () => void;
  className?: string;
}

export const UnitCard = ({ unit, side = "left", onClick, className }: UnitCardProps) => {
  const primaryWeapon = getPrimaryWeapon(unit);
  const meleeArmor = getArmorValue(unit, "melee");
  const rangedArmor = getArmorValue(unit, "ranged");
  const totalCost = getTotalCost(unit);

  return (
    <Card
      className={`p-6 border-2 border-border bg-card cursor-pointer hover:border-primary transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Image réelle au lieu d'emoji */}
        <div className="w-20 h-20 flex items-center justify-center">
          <img 
            src={unit.icon} 
            alt={unit.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback si l'image ne charge pas
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23ccc"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">?</text></svg>';
            }}
          />
        </div>
        
        <h3 className="text-xl font-serif font-semibold text-foreground text-center">{unit.name}</h3>
        
        {/* Badge pour les unités uniques */}
        {unit.unique && (
          <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full">
            Unique
          </span>
        )}
        
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cost:</span>
            <span className="text-foreground font-medium">{totalCost}</span>
          </div>
          
          {unit.costs.food > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Food:</span>
              <span className="text-foreground">{unit.costs.food}</span>
            </div>
          )}
          
          {unit.costs.wood > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wood:</span>
              <span className="text-foreground">{unit.costs.wood}</span>
            </div>
          )}
          
          {unit.costs.gold > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gold:</span>
              <span className="text-foreground">{unit.costs.gold}</span>
            </div>
          )}
          
          <div className="border-t border-border my-2"></div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">HP:</span>
            <span className="text-foreground font-medium">{unit.hitpoints}</span>
          </div>
          
          {primaryWeapon && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attack:</span>
              <span className="text-foreground">{primaryWeapon.damage} ({primaryWeapon.type})</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Melee Armor:</span>
            <span className="text-foreground">{meleeArmor}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ranged Armor:</span>
            <span className="text-foreground">{rangedArmor}</span>
          </div>
          
          {unit.movement && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed:</span>
              <span className="text-foreground">{unit.movement.speed.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
