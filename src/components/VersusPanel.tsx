import React from "react";
import { computeVersus } from "@/lib/combat";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { AoE4Unit, UnifiedVariation } from "@/data/unified-units";

interface VersusPanelProps {
  leftEntity?: AoE4Unit | UnifiedVariation; 
  rightEntity?: AoE4Unit | UnifiedVariation; 
}

// Couleur comparative (vert si meilleur, orange si pire, neutre si draw)
function compareColor(left: number | null, right: number | null, higherIsBetter: boolean): string {
  if (left === null || right === null) return "";
  if (left === right) return "";
  const better = higherIsBetter ? left > right : left < right;
  return better ? "text-green-500" : "text-orange-400";
}

export const VersusPanel: React.FC<VersusPanelProps> = ({ leftEntity, rightEntity }) => {
  if (!leftEntity || !rightEntity) {
    return (
      <div className="border border-border rounded-md p-6 text-center text-muted-foreground">
        Select two units to enable Versus mode.
      </div>
    );
  }

  const result = computeVersus(leftEntity, rightEntity);
  const A = result.attacker; // left vs right
  const B = result.defender; // right vs left

  const winnerId = result.winner;

  return (
    <TooltipProvider delayDuration={3000}>
      <div className="border border-border rounded-lg p-6 bg-card/50 backdrop-blur-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-serif font-semibold text-center flex-1">Versus Metrics</h2>
          <div className="flex items-center justify-center gap-2">
            {winnerId === "draw" ? (
              <span className="px-3 py-1 rounded-full bg-muted text-foreground text-sm font-medium">Draw</span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-primary text-background text-sm font-medium">
                Winner: {winnerId === A.id ? A.name : B.name}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Unit Metrics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold truncate" title={A.name}>{A.name}</h3>
            <div className="space-y-2">
              <MetricRow label="DPS" value={A.dps} compareValue={B.dps} higherIsBetter={true} formula={A.formula} />
              <MetricRow label="DPS/Cost" value={A.dpsPerCost} compareValue={B.dpsPerCost} higherIsBetter={true} formula={A.formula} />
              <MetricRow label="Hits to Kill" value={A.hitsToKill} compareValue={B.hitsToKill} higherIsBetter={false} formula={A.formula} />
              <MetricRow label="TTK (s)" value={A.timeToKill} compareValue={B.timeToKill} higherIsBetter={false} formula={A.formula} />
              {A.bugAttackSpeed && (
                <p className="text-xs text-red-500">Bug: attack speed = 0 (needs data fix)</p>
              )}
            </div>
          </div>
          {/* Right Unit Metrics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-right truncate" title={B.name}>{B.name}</h3>
            <div className="space-y-2">
              <MetricRow align="right" label="DPS" value={B.dps} compareValue={A.dps} higherIsBetter={true} formula={B.formula} />
              <MetricRow align="right" label="DPS/Cost" value={B.dpsPerCost} compareValue={A.dpsPerCost} higherIsBetter={true} formula={B.formula} />
              <MetricRow align="right" label="Hits to Kill" value={B.hitsToKill} compareValue={A.hitsToKill} higherIsBetter={false} formula={B.formula} />
              <MetricRow align="right" label="TTK (s)" value={B.timeToKill} compareValue={A.timeToKill} higherIsBetter={false} formula={B.formula} />
              {B.bugAttackSpeed && (
                <p className="text-xs text-red-500 text-right">Bug: attack speed = 0 (needs data fix)</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface MetricRowProps {
  label: string;
  value: number | null;
  compareValue: number | null;
  higherIsBetter: boolean;
  formula: string;
  align?: "left" | "right";
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, compareValue, higherIsBetter, formula, align = "left" }) => {
  const color = value !== null && compareValue !== null ? compareColor(value, compareValue, higherIsBetter) : "";
  return (
    <div className={`flex items-center justify-between text-sm ${align === "right" ? "flex-row-reverse" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`font-medium ${color} max-w-[140px] truncate`}>
            {value === null ? "—" : value}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs leading-snug break-words">{formula}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default VersusPanel;
