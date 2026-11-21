import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { PriceLabel } from "@/components/shared/price-label";
import type { Schemas } from "@/lib/api/types";

export type Money = Schemas["MoneyTotalDto"];

/** A report amount: a sum of confirmed or actual money, labelled as such. */
export function MoneyAmount({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}): ReactNode {
  return (
    <PriceLabel
      amountMinor={amountMinor}
      currency={currency}
      priceType="CONFIRMED"
      variant="compact"
      className="items-start"
    />
  );
}

/** Amounts per currency, one per line; "—" when there are none. */
export function MoneyLines({ amounts }: { amounts: Money[] }): ReactNode {
  if (amounts.length === 0) return "—";
  return amounts.map((amount) => (
    <span key={amount.currency} className="block">
      <MoneyAmount
        amountMinor={amount.amountMinor}
        currency={amount.currency}
      />
    </span>
  ));
}

/** One figure of a report. Not a link: the report is the detail. */
export function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <Card variant="raised">
      <p className="text-body-sm text-muted">{label}</p>
      <p className="mt-2 text-h3 tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-body-sm text-muted">{note}</p> : null}
    </Card>
  );
}

export function FigureGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-title">{title}</h2>
        {note ? (
          <p className="mt-1 max-w-reading text-body-sm text-muted">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A small table; `rows` are already formatted cells. */
export function DataTable({
  columns,
  rows,
  empty = "Nothing in this period.",
}: {
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column}>{column}</TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            {row.cells.map((cell, index) => (
              <TableCell key={columns[index]}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
