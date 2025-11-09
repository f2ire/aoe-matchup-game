import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { units } from "@/data/units";
import { UnitCard } from "@/components/UnitCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const Sandbox = () => {
  const navigate = useNavigate();
  const [unit1, setUnit1] = useState(units[0]);
  const [unit2, setUnit2] = useState(units[1]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Sandbox Mode</h1>
          <p className="text-muted-foreground text-lg">Compare any two units</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Friendly Unit</label>
            <Select value={unit1.id} onValueChange={(id) => setUnit1(units.find(u => u.id === id)!)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="text-foreground">
                    {unit.icon} {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Enemy Unit</label>
            <Select value={unit2.id} onValueChange={(id) => setUnit2(units.find(u => u.id === id)!)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id} className="text-foreground">
                    {unit.icon} {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
