import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Datos Personales", "Contacto de Emergencia", "Consentimiento"];

interface Props {
  currentStep: number;
}

export default function RegistrationStepper({ currentStep }: Props) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2",
                  done
                    ? "bg-green-600 border-green-600 text-white"
                    : active
                    ? "border-green-600 text-green-600 bg-white"
                    : "border-gray-300 text-gray-400 bg-white"
                )}
              >
                {done ? <Check size={14} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-xs mt-1",
                  active ? "text-green-600 font-medium" : "text-gray-500"
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-2",
                  idx < currentStep ? "bg-green-600" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}