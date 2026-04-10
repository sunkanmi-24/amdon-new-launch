import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

const StepIndicator = ({ currentStep, totalSteps, labels }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-bold transition-all duration-300
                  ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                  ${isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                  ${!isCompleted && !isActive ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center whitespace-nowrap
                  ${isActive ? "text-primary" : "text-muted-foreground"}
                `}
              >
                {labels[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={`h-0.5 flex-1 mx-2 mt-[-1.25rem] transition-colors duration-300
                  ${isCompleted ? "bg-primary" : "bg-border"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
