// Section 143 job-work return tracking, derived from register entries.
import type { RegisterEntry } from "../../storage/localStorage";
import { addMonthsIso, JOB_WORK_RETURN_LIMIT_MONTHS } from "../../models/deliveryChallan";

export type JobWorkStatus = "OVERDUE" | "DUE_SOON" | "ON_TRACK" | "UNKNOWN";

export type JobWorkRow = {
  entry: RegisterEntry;
  deadline: string; // ISO — statutory Sec 143 limit from challan date
  expectedReturn: string; // ISO — user's expected return date ("" if unset)
  daysToDeadline: number | null;
  status: JobWorkStatus;
};

// Statutory deadline = challan date + (1yr inputs / 3yr capital goods).
export function statutoryDeadline(entry: RegisterEntry): string {
  const months = JOB_WORK_RETURN_LIMIT_MONTHS[entry.jobWorkGoodsType ?? "INPUTS"];
  return entry.date ? addMonthsIso(entry.date, months) : "";
}

// todayIso injected so this is pure/testable.
export function buildJobWorkRows(entries: RegisterEntry[], todayIso: string): JobWorkRow[] {
  const today = new Date(todayIso);
  const rows: JobWorkRow[] = [];
  for (const entry of entries) {
    if (entry.movementType !== "DIRECT_JOB_WORK") continue;
    const deadline = statutoryDeadline(entry);
    let daysToDeadline: number | null = null;
    let status: JobWorkStatus = "UNKNOWN";
    if (deadline) {
      const d = new Date(deadline);
      daysToDeadline = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      status = daysToDeadline < 0 ? "OVERDUE" : daysToDeadline <= 30 ? "DUE_SOON" : "ON_TRACK";
    }
    rows.push({ entry, deadline, expectedReturn: entry.jobWorkReturnDate ?? "", daysToDeadline, status });
  }
  rows.sort((a, b) => (a.daysToDeadline ?? 1e9) - (b.daysToDeadline ?? 1e9));
  return rows;
}

export function statusLabel(s: JobWorkStatus): string {
  return s === "OVERDUE" ? "Overdue — deemed supply" : s === "DUE_SOON" ? "Due within 30 days" : s === "ON_TRACK" ? "On track" : "No date";
}
