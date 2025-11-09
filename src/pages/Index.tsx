import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [quizRounds, setQuizRounds] = useState("10");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-6xl font-serif font-bold text-primary mb-4">
          AOE4 Matchup Trainer
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          Train your Age of Empires IV matchup knowledge
        </p>
        <p className="text-lg text-foreground mb-12">
          Test yourself or explore unit stats in depth
        </p>

        <div className="flex flex-col gap-6 items-center max-w-md mx-auto">
          <Card className="w-full p-6 border-2 border-border bg-card">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Quiz Mode</h2>
            <p className="text-muted-foreground mb-6">
              Test your knowledge with random matchups
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Number of rounds:
              </label>
              <Select value={quizRounds} onValueChange={setQuizRounds}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="5" className="text-foreground">5 rounds</SelectItem>
                  <SelectItem value="10" className="text-foreground">10 rounds</SelectItem>
                  <SelectItem value="20" className="text-foreground">20 rounds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate(`/quiz?rounds=${quizRounds}`)}
            >
              Start Quiz
            </Button>
          </Card>

          <Card className="w-full p-6 border-2 border-border bg-card">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Sandbox Mode</h2>
            <p className="text-muted-foreground mb-6">
              Compare any two units side-by-side
            </p>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => navigate("/sandbox")}
            >
              Open Sandbox
            </Button>
          </Card>
        </div>

        <p className="text-muted-foreground text-sm mt-12">
          Created for AOE4 strategy enthusiasts
        </p>
      </motion.div>
    </div>
  );
};

export default Index;
