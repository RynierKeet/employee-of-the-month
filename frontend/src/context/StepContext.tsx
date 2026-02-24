import { createContext, useContext, useState } from "react";

interface StepContextType {
  currentStep: number;
  setCurrentStep: (n: number) => void;
}

const StepContext = createContext<StepContextType>({
  currentStep: 1,
  setCurrentStep: () => {},
});

export function StepProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  return (
    <StepContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </StepContext.Provider>
  );
}

export function useStep() {
  return useContext(StepContext);
}