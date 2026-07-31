import type { ReactNode } from 'react';

import EmptyState from '@/shared/components/EmptyState';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  caption?: string;
}

const DataTable = <T extends object>({ columns, rows, rowKey, emptyLabel, caption }: DataTableProps<T>) => {
  if (rows.length === 0) return <EmptyState title={emptyLabel} />;

  return (
    <div className="vdm-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-white/[0.025]">
            <tr className="border-b border-white/10 text-left">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-white/8 transition-colors last:border-0 hover:bg-primary/[0.035]">
                {columns.map((column) => (
                  <td key={column.header} className={`px-5 py-4 align-middle text-[#d8d8d8] ${column.className ?? ''}`}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
