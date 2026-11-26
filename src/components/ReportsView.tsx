import { useMemo, useState } from 'react';
import { FileDown, Printer, Sparkles, CalendarClock, CheckCircle2 } from 'lucide-react';
import { ReportPeriod } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { downloadCSV, formatCurrencyIDR, formatDateShort, formatDateTime } from '../utils/format';
import { StatusText } from './StatusText';

interface ReportsViewProps {
  onNotify: (msg: string, ok?: boolean) => void;
}

const PERIODS: ReportPeriod[] = ['Harian', 'Mingguan', 'Bulanan', 'Audit Keterlambatan'];

export function ReportsView({ onNotify }: ReportsViewProps) {
  const { state, generateAutoReport } = useLibrary();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('Harian');

  const analytics = useMemo(() => {
    const nowMs = Date.now();
    const periodMs =
      selectedPeriod === 'Harian'
        ? 1 * 24 * 60 * 60 * 1000
        : selectedPeriod === 'Mingguan'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    const scopedLoans =
      selectedPeriod === 'Audit Keterlambatan'
        ? state.loans.filter((l) => l.status === 'Terlambat' || l.fineAmount > 0)
        : state.loans.filter((l) => nowMs - new Date(l.borrowedAt).getTime() <= periodMs);

    const totalCopies = state.books.reduce((s, b) => s + b.totalCopies, 0);
    const borrowedCopies = state.books.reduce((s, b) => s + (b.totalCopies - b.availableCopies), 0);
    const utilizationRate = totalCopies > 0 ? Math.round((borrowedCopies / totalCopies) * 100) : 0;

    const totalFines = scopedLoans.reduce((s, l) => s + l.fineAmount, 0);
    const collectedFines = scopedLoans.filter((l) => l.finePaid).reduce((s, l) => s + l.fineAmount, 0);

    // Category breakdown across all books
    const categoryMap = new Map<string, { borrowTotal: number; titles: number }>();
    state.books.forEach((b) => {
      const curr = categoryMap.get(b.category) || { borrowTotal: 0, titles: 0 };
      categoryMap.set(b.category, {
        borrowTotal: curr.borrowTotal + b.borrowCount,
        titles: curr.titles + 1,
      });
    });
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.borrowTotal - a.borrowTotal);

    const maxCategoryBorrow = Math.max(1, ...categoryBreakdown.map((c) => c.borrowTotal));
    const topBooks = [...state.books].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 5);

    return {
      scopedLoans,
      totalCopies,
      borrowedCopies,
      utilizationRate,
      totalFines,
      collectedFines,
      categoryBreakdown,
      maxCategoryBorrow,
      topBooks,
    };
  }, [state.books, state.loans, selectedPeriod]);

  const handleGenerateSnapshot = () => {
    const snap = generateAutoReport(selectedPeriod, 'Manual');
    onNotify(`Snapshot laporan ${snap.id} (${snap.period}) berhasil dibuat otomatis.`, true);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Transaksi',
      'Kode Anggota',
      'Nama Anggota',
      'Judul Buku',
      'Tanggal Pinjam',
      'Jatuh Tempo',
      'Tanggal Kembali',
      'Status',
      'Denda (IDR)',
      'Status Denda',
    ];
    const rows = analytics.scopedLoans.map((l) => [
      l.id,
      l.memberCode,
      l.memberName,
      l.bookTitle,
      formatDateShort(l.borrowedAt),
      formatDateShort(l.dueAt),
      l.returnedAt ? formatDateShort(l.returnedAt) : '-',
      l.status,
      l.fineAmount,
      l.fineAmount === 0 ? 'Bebas Denda' : l.finePaid ? 'Lunas' : 'Belum Lunas',
    ]);
    const fileSlug = selectedPeriod.toLowerCase().replace(/\s+/g, '-');
    downloadCSV(`meowlibrary-laporan-${fileSlug}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    onNotify(`Berkas CSV laporan ${selectedPeriod} berhasil diunduh.`, true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print-only-full">
      {/* Header & Automation Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Jadwal Pelaporan Otomatis:{' '}
              {state.settings.autoReportEnabled ? state.settings.autoReportScheduleLabel : 'Nonaktif'}
            </span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
            Sistem Pelaporan Otomatis MeowLibrary
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Rekapitulasi sirkulasi koleksi, utilisasi rak, audit keterlambatan, dan ekspor arsip resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print shrink-0">
          <button
            type="button"
            onClick={handleGenerateSnapshot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hasilkan Snapshot</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedPeriod === period
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono-tabular">
          Dicetak / Diperbarui: {formatDateTime(new Date().toISOString())}
        </span>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Transaksi Periode ({selectedPeriod})</p>
          <p className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
            {analytics.scopedLoans.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Utilisasi Koleksi Aktif</p>
          <p className="font-mono-tabular text-2xl font-semibold text-blue-900 mt-1">
            {analytics.utilizationRate}%
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              ({analytics.borrowedCopies}/{analytics.totalCopies} eks)
            </span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Akumulasi Denda Periode</p>
          <p className="font-mono-tabular text-xl font-semibold text-slate-900 mt-1">
            {formatCurrencyIDR(analytics.totalFines)}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Denda Telah Dilunasi</p>
          <p className="font-mono-tabular text-xl font-semibold text-emerald-700 mt-1">
            {formatCurrencyIDR(analytics.collectedFines)}
          </p>
        </div>
      </div>

      {/* Category Breakdown & Top Books */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900">Distribusi Peminjaman per Kategori</h2>
          <div className="space-y-3.5">
            {analytics.categoryBreakdown.map((cat) => {
              const pct = Math.round((cat.borrowTotal / analytics.maxCategoryBorrow) * 100);
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat.name}</span>
                    <span className="font-mono-tabular text-slate-500">
                      {cat.borrowTotal} pinjam · {cat.titles} judul
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-900 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-base font-semibold text-slate-900">5 Koleksi Paling Diminati</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">Judul Buku</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Stok</th>
                  <th className="py-3 px-4 text-right">Total Pinjam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {analytics.topBooks.map((book) => (
                  <tr key={book.id}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{book.title}</p>
                      <p className="text-slate-500">{book.author}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{book.category}</td>
                    <td className="py-3 px-4 font-mono-tabular text-right">
                      {book.availableCopies}/{book.totalCopies}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-right font-semibold text-blue-900">
                      {book.borrowCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scoped Transaction Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Rincian Transaksi — {selectedPeriod}
          </h2>
          <span className="font-mono-tabular text-xs text-slate-500">{analytics.scopedLoans.length} baris</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Anggota</th>
                <th className="py-3 px-4">Judul Buku</th>
                <th className="py-3 px-4">Pinjam</th>
                <th className="py-3 px-4">Tenggat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Denda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {analytics.scopedLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi pada periode {selectedPeriod}.
                  </td>
                </tr>
              ) : (
                analytics.scopedLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">{loan.id}</td>
                    <td className="py-3 px-4">
                      {loan.memberName}{' '}
                      <span className="font-mono-tabular text-slate-500">({loan.memberCode})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{loan.bookTitle}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {formatDateShort(loan.borrowedAt)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {formatDateShort(loan.dueAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={loan.status} />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap">
                      {formatCurrencyIDR(loan.fineAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Report Snapshots Archive */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Arsip Snapshot Laporan Otomatis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Riwayat laporan periodik yang tersimpan otomatis oleh sistem penjadwalan
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{state.reportSnapshots.length} arsip tersimpan</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">ID Laporan</th>
                <th className="py-3 px-4">Waktu Terbit</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Pemicu</th>
                <th className="py-3 px-4 text-right">Aktif / Terlambat</th>
                <th className="py-3 px-4 text-right">Utilisasi</th>
                <th className="py-3 px-4">Buku Teratas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {state.reportSnapshots.map((snap) => (
                <tr key={snap.id}>
                  <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">{snap.id}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                    {formatDateTime(snap.generatedAt)}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{snap.period}</td>
                  <td className="py-3 px-4 text-slate-600">{snap.trigger}</td>
                  <td className="py-3 px-4 font-mono-tabular text-right">
                    {snap.activeLoans} / <span className="text-red-700">{snap.overdueLoans}</span>
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right">{snap.utilizationRate}%</td>
                  <td className="py-3 px-4 text-slate-700 truncate max-w-[220px]">{snap.topBookTitle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
