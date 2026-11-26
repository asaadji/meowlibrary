import { AlertTriangle, CheckCircle2, Clock, PauseCircle, Archive } from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export function StatusText({ status }: StatusTextProps) {
  switch (status) {
    case 'Dipinjam':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-900 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Dipinjam</span>
        </span>
      );
    case 'Terlambat':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Terlambat</span>
        </span>
      );
    case 'Dikembalikan':
    case 'Selesai':
    case 'Aktif':
    case 'Tersedia':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Menunggu':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Menunggu</span>
        </span>
      );
    case 'Siap Diambil':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Siap Diambil</span>
        </span>
      );
    case 'Ditangguhkan':
    case 'Habis':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <Archive className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
  }
}
