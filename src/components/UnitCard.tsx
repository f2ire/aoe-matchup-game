import { Unit } from "@/data/units";
import { Card } from "@/components/ui/card";

interface UnitCardProps {
  unit: Unit;
  side?: "left" | "right";
  onClick?: () => void;
  className?: string;
}

export const UnitCard = ({ unit, side = "left", onClick, className }: UnitCardProps) => {
  return (
    <Card
      className={`p-6 border-2 border-border bg-card cursor-pointer hover:border-primary transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">{unit.icon}</div>
        <h3 className="text-xl font-serif font-semibold text-foreground">{unit.name}</h3>
        <div className="w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="text-foreground">
              {unit.cost.food ? `${unit.cost.food}F ` : ""}
              {unit.cost.wood ? `${unit.cost.wood}W ` : ""}
              {unit.cost.gold ? `${unit.cost.gold}G` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">HP:</span>
            <span className="text-foreground">{unit.hp}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Attack:</span>
            <span className="text-foreground">{unit.attack}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Melee Armor:</span>
            <span className="text-foreground">{unit.meleeArmor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ranged Armor:</span>
            <span className="text-foreground">{unit.rangedArmor}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
