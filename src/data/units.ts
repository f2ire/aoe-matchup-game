export interface Unit {
  id: string;
  name: string;
  icon: string;
  cost: {
    food?: number;
    wood?: number;
    gold?: number;
  };
  hp: number;
  meleeArmor: number;
  rangedArmor: number;
  attack: number;
  type: string;
}

export const units: Unit[] = [
  {
    id: "spearman",
    name: "Spearman",
    icon: "🗡️",
    cost: { food: 60, wood: 20 },
    hp: 70,
    meleeArmor: 0,
    rangedArmor: 0,
    attack: 8,
    type: "Infantry"
  },
  {
    id: "archer",
    name: "Archer",
    icon: "🏹",
    cost: { wood: 30, gold: 20 },
    hp: 60,
    meleeArmor: 0,
    rangedArmor: 0,
    attack: 6,
    type: "Ranged"
  },
  {
    id: "knight",
    name: "Knight",
    icon: "🐴",
    cost: { food: 140, gold: 100 },
    hp: 150,
    meleeArmor: 4,
    rangedArmor: 4,
    attack: 18,
    type: "Cavalry"
  },
  {
    id: "crossbowman",
    name: "Crossbowman",
    icon: "🎯",
    cost: { wood: 40, gold: 35 },
    hp: 70,
    meleeArmor: 0,
    rangedArmor: 0,
    attack: 10,
    type: "Ranged"
  },
  {
    id: "man_at_arms",
    name: "Man-at-Arms",
    icon: "⚔️",
    cost: { food: 100, gold: 20 },
    hp: 110,
    meleeArmor: 3,
    rangedArmor: 3,
    attack: 12,
    type: "Infantry"
  },
  {
    id: "horseman",
    name: "Horseman",
    icon: "🏇",
    cost: { food: 100, wood: 20 },
    hp: 125,
    meleeArmor: 2,
    rangedArmor: 2,
    attack: 12,
    type: "Cavalry"
  },
  {
    id: "pikeman",
    name: "Pikeman",
    icon: "🔱",
    cost: { food: 80, wood: 40 },
    hp: 85,
    meleeArmor: 0,
    rangedArmor: 0,
    attack: 10,
    type: "Infantry"
  },
  {
    id: "mangonel",
    name: "Mangonel",
    icon: "⚙️",
    cost: { wood: 200, gold: 100 },
    hp: 120,
    meleeArmor: 0,
    rangedArmor: 6,
    attack: 40,
    type: "Siege"
  },
  {
    id: "scout",
    name: "Scout",
    icon: "👀",
    cost: { food: 70 },
    hp: 90,
    meleeArmor: 0,
    rangedArmor: 0,
    attack: 6,
    type: "Cavalry"
  },
  {
    id: "ram",
    name: "Battering Ram",
    icon: "🐏",
    cost: { wood: 300, gold: 50 },
    hp: 700,
    meleeArmor: 0,
    rangedArmor: 195,
    attack: 75,
    type: "Siege"
  }
];

// Simple matchup logic (can be expanded)
export function determineWinner(unit1: Unit, unit2: Unit): string {
  // Simplified combat calculation
  const unit1Effective = (unit1.hp / 10) + unit1.attack - (unit2.meleeArmor / 2);
  const unit2Effective = (unit2.hp / 10) + unit2.attack - (unit1.meleeArmor / 2);
  
  if (Math.abs(unit1Effective - unit2Effective) < 2) {
    return "draw";
  }
  
  return unit1Effective > unit2Effective ? unit1.id : unit2.id;
}
