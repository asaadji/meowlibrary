import { useMemo, useState } from 'react';
import {
  Activity,
  BookMarked,
  CreditCard,
  History,
  Layers,
  Radio,
  RotateCcw,
  CalendarPlus,
  BookOpen,
} from 'lucide-react';
import { Book } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { formatCurrencyIDR, formatDateShort, formatTimeOnly, getDaysDifference } from '../utils/format';
import { StatusText } from './StatusText';
import { BookCover } from './BookCover';

interface MemberDashboardViewProps {
  onSelectBook: (book: Book) => void;
  onNotify: (msg: string, ok?: boolean) => void;
  onNavigateCatalog: () => void;
}

type MemberTab = 'overview' | 'active' | 'saved' | 'history' | 'card';

export function MemberDashboardView({
  onSelectBook,
  onNotify,
  onNavigateCatalog,
}: MemberDashboardViewProps) {
  const {
    state,
    currentUser,
    isRealtimeConnected,
    returnBook,
    renewLoan,
    cancelReservation,
    toggleBookmark,
    markFinePaid,
  } = useLibrary();

  const [activeTab, setActiveTab] = useState<MemberTab>('overview');

  // If currently signed in as Admin, allow previewing/monitoring any member or prompt cleanly
  const targetMember = useMemo(() => {
    if (currentUser.role === 'member') return currentUser;
    return state.users.find((u) => u.role === 'member') || currentUser;
  }, [currentUser, state.users]);

  const memberLoans = useMemo(
    () => state.loans.filter((l) => l.memberId === targetMember.id),
    [state.loans, targetMember.id]
  );

  const activeLoans = useMemo(
    () => memberLoans.filter((l) => l.status !== 'Dikembalikan'),
    [memberLoans]
  );

  const pastLoans = useMemo(
    () => memberLoans.filter((l) => l.status === 'Dikembalikan'),
    [memberLoans]
  );

  const unpaidFines = useMemo(
    () => memberLoans.filter((l) => l.fineAmount > 0 && !l.finePaid),
    [memberLoans]
  );

  const totalUnpaidFineIdr = useMemo(
    () => unpaidFines.reduce((sum, l) => sum + l.fineAmount, 0),
    [unpaidFines]
  );

  const memberReservations = useMemo(
    () =>
      state.reservations.filter(
        (r) => r.memberId === targetMember.id && (r.status === 'Menunggu' || r.status === 'Siap Diambil')
      ),
    [state.reservations, targetMember.id]
  );

  const bookmarkedBooks = useMemo(
    () => state.books.filter((b) => targetMember.bookmarks.includes(b.id)),
    [state.books, targetMember.bookmarks]
  );

  const memberActivities = useMemo(() => {
    const relevant = state.activities.filter(
      (a) => a.memberId === targetMember.id || a.type === 'COLLECTION_ADD'
    );
    return relevant.slice(0, 12);
  }, [state.activities, targetMember.id]);

  const recommendedBooks = useMemo(() => {
    const borrowedIds = new Set(memberLoans.map((l) => l.bookId));
    return state.books.filter((b) => !borrowedIds.has(b.id) && b.availableCopies > 0).slice(0, 3);
  }, [state.books, memberLoans]);

  const navItems: { id: MemberTab; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Ringkasan Real-Time', icon: Activity },
    { id: 'active', label: `Peminjaman Aktif (${activeLoans.length})`, icon: Layers },
    { id: 'saved', label: `Reservasi & Simpanan`, icon: BookMarked },
    { id: 'history', label: 'Riwayat & Denda', icon: History },
    { id: 'card', label: 'Kartu Anggota', icon: CreditCard },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Workspace Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Dasbor Anggota</p>
              <p className="font-display text-base font-semibold text-slate-900 mt-0.5 truncate">
                {targetMember.name}
              </p>
              <p className="font-mono-tabular text-xs text-slate-500 mt-0.5">
                {targetMember.memberCode} · {targetMember.department}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <StatusText status={targetMember.status} />
              <span className="font-mono-tabular text-slate-600">
                Kuota {activeLoans.length}/{state.settings.maxActiveLoans}
              </span>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 text-left ${
                    isActive
                      ? 'bg-blue-900 text-white'
                      : 'bg-white lg:bg-transparent text-slate-700 border lg:border-0 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {currentUser.role === 'admin' && (
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
              Anda masuk sebagai Admin. Tampilan ini menampilkan pratinjau dasbor untuk anggota{' '}
              <span className="font-semibold text-slate-900">{targetMember.name}</span>.
            </div>
          )}
        </aside>

        {/* Main Content Viewport */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Top Breadcrumb + Sync Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>MeowLibrary</span>
              <span>/</span>
              <span>Dashboard Member</span>
              <span>/</span>
              <span className="font-medium text-slate-900">
                {navItems.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium whitespace-nowrap">
                <Radio className="w-3.5 h-3.5" />
                <span>{isRealtimeConnected ? 'Sinkronisasi Real-Time Aktif' : 'Mode Lokal'}</span>
              </span>
              <button
                type="button"
                onClick={onNavigateCatalog}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Pinjam Buku Baru
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-500">Sedang Dipinjam</p>
              <p className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">
                {activeLoans.length}
                <span className="text-sm font-normal text-slate-400"> / {state.settings.maxActiveLoans}</span>
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-500">Antrean Reservasi</p>
              <p className="font-mono-tabular text-2xl font-semibold text-blue-900 mt-1">
                {memberReservations.length}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-500">Total Buku Dibaca</p>
              <p className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">{pastLoans.length}</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs text-slate-500">Tagihan Denda Aktif</p>
              <p
                className={`font-mono-tabular text-xl font-semibold mt-1 ${
                  totalUnpaidFineIdr > 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {formatCurrencyIDR(totalUnpaidFineIdr)}
              </p>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Active Loans Preview */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900">Pinjaman Aktif Anda</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className="text-xs font-medium text-blue-900 hover:underline whitespace-nowrap"
                  >
                    Kelola Semua
                  </button>
                </div>
                {activeLoans.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-600">Anda belum memiliki buku yang sedang dipinjam.</p>
                    <button
                      type="button"
                      onClick={onNavigateCatalog}
                      className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800"
                    >
                      Jelajahi Katalog
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {activeLoans.map((loan) => {
                      const daysLeft = getDaysDifference(loan.dueAt);
                      return (
                        <div key={loan.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{loan.bookTitle}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
                              {loan.id} · Tenggat {formatDateShort(loan.dueAt)} ·{' '}
                              {daysLeft < 0 ? (
                                <span className="text-red-700 font-semibold">Terlambat {Math.abs(daysLeft)} hari</span>
                              ) : (
                                <span>Sisa {daysLeft} hari</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusText status={loan.status} />
                            <button
                              type="button"
                              onClick={() => {
                                const res = returnBook(loan.id, true);
                                onNotify(res.message, res.ok);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                            >
                              Kembalikan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-Time Activity Stream */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900">Aktivitas Transaksi Real-Time</h3>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {formatTimeOnly(state.lastSyncedAt)}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 max-h-[360px] overflow-y-auto">
                  {memberActivities.length === 0 ? (
                    <p className="p-6 text-xs text-slate-500 text-center">Belum ada log transaksi terbaru.</p>
                  ) : (
                    memberActivities.map((act) => (
                      <div key={act.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900">{act.summary}</span>
                          <span className="font-mono-tabular text-slate-400 shrink-0">
                            {formatTimeOnly(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{act.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommended Books */}
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900">Rekomendasi Bacaan untuk Anda</h3>
                  <button
                    type="button"
                    onClick={onNavigateCatalog}
                    className="text-xs font-medium text-blue-900 hover:underline"
                  >
                    Lihat Katalog Lengkap
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendedBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex gap-3.5 p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <BookCover
                        src={book.coverUrl}
                        title={book.title}
                        className="w-16 h-22 rounded shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] text-slate-500 truncate">{book.category}</p>
                          <p className="font-display text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                            {book.title}
                          </p>
                          <p className="text-xs text-slate-600 truncate mt-0.5">{book.author}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectBook(book)}
                          className="text-xs font-medium text-blue-900 hover:underline text-left mt-2"
                        >
                          Detail & Pinjam
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE LOANS TAB */}
          {activeTab === 'active' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-900">Daftar Peminjaman Aktif</h3>
                <span className="text-xs text-slate-500">
                  Denda keterlambatan: <span className="font-mono-tabular">{formatCurrencyIDR(state.settings.dailyFineIdr)}/hari</span>
                </span>
              </div>
              {activeLoans.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">Tidak ada peminjaman aktif saat ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                        <th className="py-3 px-4">ID Transaksi</th>
                        <th className="py-3 px-4">Judul Buku</th>
                        <th className="py-3 px-4">Tgl Pinjam</th>
                        <th className="py-3 px-4">Tenggat</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Denda</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {activeLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">{loan.id}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{loan.bookTitle}</td>
                          <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {formatDateShort(loan.borrowedAt)}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {formatDateShort(loan.dueAt)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusText status={loan.status} />
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap text-slate-900">
                            {formatCurrencyIDR(loan.fineAmount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = renewLoan(loan.id);
                                  onNotify(res.message, res.ok);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>Perpanjang</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = returnBook(loan.id, true);
                                  onNotify(res.message, res.ok);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-900 rounded-md hover:bg-blue-800 whitespace-nowrap"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Kembalikan</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SAVED & RESERVATIONS TAB */}
          {activeTab === 'saved' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-display text-base font-semibold text-slate-900">Antrean Reservasi Buku</h3>
                </div>
                {memberReservations.length === 0 ? (
                  <p className="p-6 text-xs text-slate-500 text-center">Anda tidak memiliki antrean reservasi aktif.</p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {memberReservations.map((res) => (
                      <div key={res.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{res.bookTitle}</p>
                          <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                            {res.id} · Dipesan {formatDateShort(res.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusText status={res.status} />
                          <button
                            type="button"
                            onClick={() => {
                              const r = cancelReservation(res.id);
                              onNotify(r.message, r.ok);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Daftar Bacaan Tersimpan ({bookmarkedBooks.length})
                  </h3>
                </div>
                {bookmarkedBooks.length === 0 ? (
                  <p className="p-6 text-xs text-slate-500 text-center">
                    Belum ada buku yang disimpan. Klik ikon simpan pada katalog untuk menambah daftar bacaan.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {bookmarkedBooks.map((book) => (
                      <div key={book.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <BookCover src={book.coverUrl} title={book.title} className="w-10 h-14 rounded shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{book.title}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {book.author} · {book.shelfLocation}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSelectBook(book)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(book.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY & FINES TAB */}
          {activeTab === 'history' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-900">Riwayat Peminjaman & Denda</h3>
                <span className="font-mono-tabular text-xs text-slate-500">{memberLoans.length} transaksi tercatat</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Judul Buku</th>
                      <th className="py-3 px-4">Tgl Pinjam</th>
                      <th className="py-3 px-4">Tgl Kembali</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Denda</th>
                      <th className="py-3 px-4 text-right">Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {memberLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">{loan.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{loan.bookTitle}</td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                          {formatDateShort(loan.borrowedAt)}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                          {loan.returnedAt ? formatDateShort(loan.returnedAt) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={loan.status} />
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap">
                          {formatCurrencyIDR(loan.fineAmount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {loan.fineAmount === 0 ? (
                            <span className="text-slate-400">Bebas Denda</span>
                          ) : loan.finePaid ? (
                            <span className="text-emerald-700 font-medium">Lunas</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const r = markFinePaid(loan.id);
                                onNotify(r.message, r.ok);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-blue-900 rounded hover:bg-blue-800"
                            >
                              Bayar Denda
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DIGITAL LIBRARY CARD TAB */}
          {activeTab === 'card' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col items-center">
              <div className="w-full max-w-md bg-slate-900 text-white rounded-xl p-6 space-y-6 border border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold tracking-tight">MeowLibrary</p>
                    <p className="text-xs text-slate-400">Kartu Anggota Perpustakaan Digital</p>
                  </div>
                  <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M5 9V4l4 3h6l4-3v5a7 7 0 0 1-14 0Z" />
                    <path d="M9 11h.01M15 11h.01" />
                    <path d="M10 14c.6.6 1.4.8 2 .8s1.4-.2 2-.8" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Nama Pemegang Kartu</p>
                  <p className="font-display text-xl font-semibold">{targetMember.name}</p>
                  <p className="text-xs text-slate-300">{targetMember.department}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div>
                    <p className="text-slate-400">Nomor Anggota</p>
                    <p className="font-mono-tabular font-semibold mt-0.5">{targetMember.memberCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Terdaftar Sejak</p>
                    <p className="font-mono-tabular font-semibold mt-0.5">{formatDateShort(targetMember.joinedAt)}</p>
                  </div>
                </div>

                {/* Barcode visual strips */}
                <div className="bg-white rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-[2px] h-8 flex-1 overflow-hidden" aria-hidden="true">
                    {[3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2].map(
                      (w, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-900 h-full inline-block"
                          style={{ width: `${w * 2}px` }}
                        />
                      )
                    )}
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold text-slate-900 shrink-0">
                    {targetMember.memberCode}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
