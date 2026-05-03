import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import DataTable, {
  type Column,
  type EmptyStateProps,
  type RowAction,
} from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import Pagination from "@/components/common/Pagination";
import { cn } from "@/lib/utils";

interface PaginationConfig {
  count: number;
  page: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

interface ListPageTemplateProps<T> {
  title: string;
  description?: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  filters?: ReactNode;
  /** Optional KPI/stats slot rendered above the filters/table. */
  stats?: ReactNode;

  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowActions?: RowAction<T>[];
  rowKey?: (row: T) => string | number;
  mobileCard?: (row: T) => ReactNode;
  empty?: EmptyStateProps;
  density?: "comfortable" | "compact";

  pagination?: PaginationConfig;

  /** A side-effect form/sheet rendered alongside the page (e.g. CRUD modal). */
  formSheet?: ReactNode;

  className?: string;
}

export function ListPageTemplate<T extends Record<string, any>>({
  title,
  description,
  eyebrow,
  primaryAction,
  filters,
  stats,
  columns,
  data,
  loading,
  rowActions,
  rowKey,
  mobileCard,
  empty,
  density,
  pagination,
  formSheet,
  className,
}: ListPageTemplateProps<T>) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        actions={primaryAction}
      />

      {stats}

      {filters && (
        <Card>
          <CardContent className="p-4 sm:p-5">{filters}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-2 sm:p-4">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            rowActions={rowActions}
            rowKey={rowKey}
            mobileCard={mobileCard}
            empty={empty}
            density={density}
          />
          {pagination && (
            <div className="px-2 pb-1">
              <Pagination
                count={pagination.count}
                page={pagination.page}
                pageSize={pagination.pageSize}
                onPageChange={pagination.onChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {formSheet}
    </div>
  );
}
