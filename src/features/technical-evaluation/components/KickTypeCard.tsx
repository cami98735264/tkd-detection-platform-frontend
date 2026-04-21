import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KickTypeCardProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

export default function KickTypeCard({ name, selected, onClick }: KickTypeCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer text-center transition-all hover:border-green-500",
        selected ? "border-green-600 bg-green-50 ring-2 ring-green-500" : "border-border",
      )}
      onClick={onClick}
    >
      <p className={cn("font-semibold text-lg", selected ? "text-green-700" : "text-foreground")}>
        {name}
      </p>
    </Card>
  );
}