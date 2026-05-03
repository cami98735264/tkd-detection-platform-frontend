import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  count: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  count,
  page,
  pageSize = 5,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted">
        {count} registro{count !== 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </Button>

        <span className="text-sm tabular-nums text-text">
          {page} <span className="text-faint">/</span> {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
