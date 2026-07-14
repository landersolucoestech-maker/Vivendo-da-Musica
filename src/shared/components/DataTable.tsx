import type { ReactNode } from "react";
import EmptyState from "@/shared/components/EmptyState";

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyLabel: string;
}

const DataTable = <T extends Record<string, any>>({ columns, rows, rowKey, emptyLabel }: DataTableProps<T>) => {
  if (rows.length === 0) {
    return <EmptyState title={emptyLabel} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((col) => (
              <th key={col.header} className="px-5 py-3 font-medium whitespace-nowrap">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-0">
              {columns.map((col) => (
                <td key={col.header} className="px-5 py-3 whitespace-nowrap">{col.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
