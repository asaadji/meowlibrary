export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function getDaysDifference(targetIso: string, baseIso?: string): number {
  const target = new Date(targetIso).getTime();
  const base = baseIso ? new Date(baseIso).getTime() : Date.now();
  return Math.ceil((target - base) / (1000 * 60 * 60 * 24));
}

export function computeFineAmount(dueAtIso: string, dailyFineIdr: number, referenceIso?: string): number {
  const dueMs = new Date(dueAtIso).getTime();
  const refMs = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  if (refMs <= dueMs) return 0;
  const lateDays = Math.ceil((refMs - dueMs) / (1000 * 60 * 60 * 24));
  return Math.max(0, lateDays * dailyFineIdr);
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number): string => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  // UTF-8 BOM so Indonesian Excel parses characters & columns cleanly
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
