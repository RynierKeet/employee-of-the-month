// src/context/StepContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../auth";
import { useLocation } from "react-router-dom";

interface StepContextType {
  currentStep: number;
  setCurrentStep: (n: number) => void;
}

const StepContext = createContext<StepContextType>({
  currentStep: 1,
  setCurrentStep: () => {},
});

export function StepProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!me) return;

    // Adjudicators and Admins do NOT use the step system
    if (me.role === "Adjudicator" || me.role === "Admin") {
      setCurrentStep(0);
      return;
    }

    // Employees: determine step based on URL
    const path = location.pathname;

    if (path.startsWith("/app/submit-reflection")) setCurrentStep(1);
    else if (path.startsWith("/app/vote")) setCurrentStep(2);
    else if (path.startsWith("/results")) setCurrentStep(3);
    else if (path.startsWith("/final-results")) setCurrentStep(4);
    else setCurrentStep(1);
  }, [me, location.pathname]);

  return (
    <StepContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </StepContext.Provider>
  );
}

export function useStep() {
  return useContext(StepContext);
}