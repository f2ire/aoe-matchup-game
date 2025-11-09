import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const Results = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "10");
  const percentage = Math.round((score / total) * 100);

  const getMessage = () => {
    if (percentage >= 90) return "Outstanding! You're a master strategist! 🏆";
    if (percentage >= 70) return "Great job! You know your units well! 🎯";
    if (percentage >= 50) return "Good effort! Keep practicing! 💪";
    return "Keep learning! Practice makes perfect! 📚";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-12 border-2 border-primary bg-card text-center">
          <h1 className="text-5xl font-serif font-bold text-primary mb-6">Quiz Complete!</h1>
          
          <div className="mb-8">
            <div className="text-7xl font-bold text-foreground mb-4">
              {score} / {total}
            </div>
            <div className="text-3xl text-muted-foreground mb-4">
              {percentage}% Correct
            </div>
            <p className="text-xl text-foreground">{getMessage()}</p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/quiz?rounds=" + total)}
            >
              Play Again
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/")}
            >
              Go Home
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Results;
