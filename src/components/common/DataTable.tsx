import { CheckCircle, Eye, Inbox, Pencil, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  /** Hide on viewports < md (when mobile-card fallback is also missing). */
  hideOnMobile?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
  variant?: "default" | "ghost" | "outline" | "destructive" | "tonal";
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowActions?: RowAction<T>[];
  rowKey?: (row: T) => string | number;
  /** When provided, viewports < md render a stacked card list instead of the table. */
  mobileCard?: (row: T) => ReactNode;
  empty?: EmptyStateProps;
  skeletonRows?: number;
  density?: "comfortable" | "compact";

  /** @deprecated Use `rowActions` instead. */
  onEdit?: (row: T) => void;
  /** @deprecated Use `rowActions` instead. */
  onDelete?: (row: T) => void;
  /** @deprecated Use `rowActions` instead. */
  onConfirm?: (row: T) => void;
  /** @deprecated Use `rowActions` instead. */
  onViewConfirmations?: (row: T) => void;
  /** @deprecated Use `rowActions` instead. */
  confirmLabel?: string | ((row: T) => string);
  /** @deprecated Use `rowActions` instead. */
  viewConfirmationsLabel?: string;
}

const DENSITY_CELL = {
  comfortable: "py-3.5",
  compact: "py-2",
} as const;

const ALIGN_CLS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export default function DataTable<T extends Record<string, any>>(
  props: DataTableProps<T>
) {
  const {
    columns,
    data,
    loading,
    rowActions,
    rowKey,
    mobileCard,
    empty,
    skeletonRows = 5,
    density = "comfortable",
  } = props;

  const actions = mergeLegacyActions(props);
  const showActions = actions.length > 0;

  if (loading) {
    return (
      <div
        className="space-y-2.5 animate-fade-in"
        style={{ animationDuration: "var(--duration-slow)" }}
      >
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={empty?.icon ?? Inbox}
        title={empty?.title ?? "Sin registros"}
        description={empty?.description ?? "Aún no hay datos para mostrar."}
        action={empty?.action}
      />
    );
  }

  const visibleColumns = (mobile: boolean) =>
    mobile ? columns.filter((c) => !c.hideOnMobile) : columns;

  return (
    <div
      className="animate-fade-in"
      style={{ animationDuration: "var(--duration-slow)" }}
    >
      {/* Desktop / no-mobile-card path */}
      <div className={cn(mobileCard && "hidden md:block")}>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns(false).map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(ALIGN_CLS[col.align ?? "left"], col.className)}
                  >
                    {col.header}
                  </TableHead>
                ))}
                {showActions && (
                  <TableHead className="text-right">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow
                  key={rowKey ? rowKey(row) : (row.id ?? idx)}
                  className="animate-slide-up-fade"
                  style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
                >
                  {visibleColumns(false).map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        DENSITY_CELL[density],
                        ALIGN_CLS[col.align ?? "left"],
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell className={cn(DENSITY_CELL[density], "text-right")}>
                      <RowActionButtons row={row} actions={actions} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile card path */}
      {mobileCard && (
        <div className="md:hidden space-y-3">
          {data.map((row, idx) => (
            <div
              key={rowKey ? rowKey(row) : (row.id ?? idx)}
              className="rounded-lg border border-border bg-surface p-4 shadow-subtle animate-slide-up-fade"
              style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
            >
              {mobileCard(row)}
              {showActions && (
                <div className="mt-3 flex justify-end gap-1 border-t border-divider pt-3">
                  <RowActionButtons row={row} actions={actions} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RowActionButtons<T>({
  row,
  actions,
}: {
  row: T;
  actions: RowAction<T>[];
}) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="inline-flex items-center justify-end gap-0.5">
        {actions
          .filter((a) => (a.show ? a.show(row) : true))
          .map((a) => {
            const Icon = a.icon;
            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={a.variant ?? "ghost"}
                    size="icon"
                    onClick={() => a.onClick(row)}
                    aria-label={a.label}
                    className={cn(
                      "h-8 w-8",
                      a.variant === "destructive" &&
                        "bg-transparent text-error hover:bg-error/10"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{a.label}</TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </TooltipProvider>
  );
}

/**
 * Maps the legacy onEdit/onDelete/onConfirm/onViewConfirmations props onto the
 * new rowActions config so existing call sites keep working without churn.
 * Remove after Phase 5 migration completes.
 */
function mergeLegacyActions<T extends Record<string, any>>(
  props: DataTableProps<T>
): RowAction<T>[] {
  const { rowActions, onEdit, onDelete, onConfirm, onViewConfirmations, confirmLabel, viewConfirmationsLabel } =
    props;
  if (rowActions && rowActions.length > 0) return rowActions;

  const out: RowAction<T>[] = [];
  if (onViewConfirmations) {
    out.push({
      id: "view-confirmations",
      label: viewConfirmationsLabel ?? "Verificar",
      icon: Eye,
      onClick: onViewConfirmations,
      variant: "outline",
    });
  }
  if (onConfirm) {
    out.push({
      id: "confirm",
      label:
        typeof confirmLabel === "function"
          ? "Confirmar"
          : (confirmLabel ?? "Confirmar"),
      icon: CheckCircle,
      onClick: onConfirm,
      variant: "tonal",
    });
  }
  if (onEdit) {
    out.push({
      id: "edit",
      label: "Editar",
      icon: Pencil,
      onClick: onEdit,
      variant: "ghost",
    });
  }
  if (onDelete) {
    out.push({
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      onClick: onDelete,
      variant: "destructive",
    });
  }
  return out;
}
