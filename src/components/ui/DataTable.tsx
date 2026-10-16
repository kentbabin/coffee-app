"use client";

import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export type DataTableColumn<Row> = {
  key: string;
  label: string;
  /** Shows a sort button in the header and sets aria-sort. */
  sortable?: boolean;
  align?: "left" | "right";
  /** Mono tabular figures, for counts and scores. */
  numeric?: boolean;
  /** Custom cell. Put the link to the edit page in the name column. */
  render?: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  /** Called with the column key. The caller sorts the rows. */
  onSort?: (key: string) => void;
  /** Mouse shortcut only. Keyboard users reach the row through a link in a cell. */
  onRowClick?: (row: Row) => void;
  /** Accessible name for the table, visually hidden. */
  caption: string;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  className?: string;
};

/** A sortable table for admin lists. Never on the public site. */
export function DataTable<Row>({ columns, rows, rowKey, sortKey, sortDir, onSort, onRowClick, caption, empty = "No rows", className }: DataTableProps<Row>) {
  return (
    <div className={cx("ca-table-wrap", className)}>
      <table className="ca-table">
        <caption className="ca-table__caption">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sortKey === c.key;
              const ariaSort = c.sortable ? (sorted ? (sortDir === "desc" ? "descending" : "ascending") : "none") : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={ariaSort} className={c.align === "right" ? "is-right" : undefined}>
                  {c.sortable ? (
                    <button type="button" className="ca-th__btn" onClick={() => onSort?.(c.key)}>
                      {c.label}
                      <Icon name={sorted ? (sortDir === "desc" ? "chevronDown" : "chevronUp") : "sort"} size={14} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? "is-clickable" : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        // Let links and buttons inside the row do their own thing.
                        if ((e.target as HTMLElement).closest("a, button")) return;
                        onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className={cx(c.align === "right" && "is-right", c.numeric && "is-num")}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="ca-table__empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
