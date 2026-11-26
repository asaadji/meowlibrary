import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookCopy,
  Users,
  Settings,
  ArrowLeftRight,
  Plus,
  Search,
  Pencil,
  Trash2,
  Radio,
  Download,
  Upload,
  RotateCcw,
  X,
} from 'lucide-react';
import { Book, BookCategory, LoanStatus } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { COVER_PRESETS } from '../data/seedData';
import { formatCurrencyIDR, formatDateShort, formatTimeOnly } from '../utils/format';
import { StatusText } from './StatusText';
import { BookCover } from './BookCover';

interface AdminDashboardViewProps {
  onNotify: (msg: string, ok?: boolean) => void;
  onNavigateReports: () => void;
}

type AdminTab = 'monitor' | 'collections' | 'circulation' | 'members' | 'settings';

const CATEGORIES: BookCategory[] = [
  'Sastra & Fiksi',
  'Sains & Astronomi',
  'Arsitektur & Desain',
  'Botani & Sejarah',
  'Teknologi & Sistem',
];

export function AdminDashboardView({ onNotify, onNavigateReports }: AdminDashboardViewProps) {
  const {
    state,
    isRealtimeConnected,
    borrowBook,
    returnBook,
    markFinePaid,
    fulfillReservation,
    cancelReservation,
    addBook,
    updateBook,
    deleteBook,
    registerMember,
    toggleMemberStatus,
    updateSettings,
    resetDemoData,
    importStateJson,
  } = useLibrary();

  const [activeTab, setActiveTab] = useState<AdminTab>('monitor');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState<'Semua' | LoanStatus>('Semua');
  const [memberSearch, setMemberSearch] = useState('');

  // Book Add/Edit Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    year: 2026,
    category: 'Sastra & Fiksi' as BookCategory,
    shelfLocation: 'Rak A-01',
    pages: 240,
    language: 'Indonesia',
    totalCopies: 4,
    coverUrl: COVER_PRESETS.fiction,
    synopsis: '',
    excerpt: '',
  });

  // Counter Borrow Modal
  const [deskBorrowOpen, setDeskBorrowOpen] = useState(false);
  const [deskMemberId, setDeskMemberId] = useState('');
  const [deskBookId, setDeskBookId] = useState('');
  const [deskDays, setDeskDays] = useState(state.settings.defaultLoanDays);

  // New Member Modal
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', phone: '', department: '' });

  // Settings form
  const [settingsDraft, setSettingsDraft] = useState(state.settings);

  const metrics = useMemo(() => {
    const totalBooks = state.books.reduce((s, b) => s + b.totalCopies, 0);
    const availableBooks = state.books.reduce((s, b) => s + b.availableCopies, 0);
    const activeLoans = state.loans.filter((l) => l.status !== 'Dikembalikan');
    const overdueLoans = state.loans.filter((l) => l.status === 'Terlambat');
    const unpaidFineTotal = state.loans
      .filter((l) => !l.finePaid)
      .reduce((s, l) => s + l.fineAmount, 0);
    return {
      totalBooks,
      availableBooks,
      activeCount: activeLoans.length,
      overdueCount: overdueLoans.length,
      overdueLoans,
      unpaidFineTotal,
    };
  }, [state.books, state.loans]);

  // Compute 7-day circulation chart data from real loans
  const chartDays = useMemo(() => {
    const days: { label: string; borrows: number; returns: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      const borrows = state.loans.filter((l) => l.borrowedAt.slice(0, 10) === dayStr).length;
      const returns = state.loans.filter((l) => l.returnedAt && l.returnedAt.slice(0, 10) === dayStr).length;
      days.push({ label, borrows, returns });
    }
    return days;
  }, [state.loans]);

  const maxChartVal = Math.max(3, ...chartDays.map((d) => Math.max(d.borrows, d.returns)));

  const filteredBooks = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    if (!q) return state.books;
    return state.books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfLocation.toLowerCase().includes(q)
    );
  }, [state.books, collectionSearch]);

  const filteredLoans = useMemo(() => {
    if (loanFilter === 'Semua') return state.loans;
    return state.loans.filter((l) => l.status === loanFilter);
  }, [state.loans, loanFilter]);

  const membersList = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return state.users
      .filter((u) => u.role === 'member')
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.memberCode.toLowerCase().includes(q));
  }, [state.users, memberSearch]);

  const pendingReservations = useMemo(
    () => state.reservations.filter((r) => r.status === 'Menunggu' || r.status === 'Siap Diambil'),
    [state.reservations]
  );

  const openAddBookModal = () => {
    setEditingBook(null);
    setBookForm({
      isbn: `978-623-${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}-0`,
      title: '',
      author: '',
      publisher: 'Pustaka Aksara Nusantara',
      year: 2026,
      category: 'Sastra & Fiksi',
      shelfLocation: 'Rak A-12',
      pages: 250,
      language: 'Indonesia',
      totalCopies: 4,
      coverUrl: COVER_PRESETS.fiction,
      synopsis: '',
      excerpt: '',
    });
    setBookModalOpen(true);
  };

  const openEditBookModal = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      year: book.year,
      category: book.category,
      shelfLocation: book.shelfLocation,
      pages: book.pages,
      language: book.language,
      totalCopies: book.totalCopies,
      coverUrl: book.coverUrl,
      synopsis: book.synopsis,
      excerpt: book.excerpt,
    });
    setBookModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBook) {
      const res = updateBook(editingBook.id, bookForm);
      onNotify(res.message, res.ok);
      if (res.ok) setBookModalOpen(false);
    } else {
      const res = addBook(bookForm);
      onNotify(res.message, res.ok);
      if (res.ok) setBookModalOpen(false);
    }
  };

  const handleDeskBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = borrowBook(deskBookId, deskDays, deskMemberId);
    onNotify(res.message, res.ok);
    if (res.ok) setDeskBorrowOpen(false);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerMember(memberForm);
    onNotify(res.message, res.ok);
    if (res.ok) {
      setMemberForm({ name: '', email: '', phone: '', department: '' });
      setMemberModalOpen(false);
    }
  };

  const handleDownloadJsonBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meowlibrary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('Cadangan data JSON berhasil diunduh.', true);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importStateJson(String(reader.result || ''));
      onNotify(res.message, res.ok);
    };
    reader.readAsText(file);
  };

  const navItems: { id: AdminTab; label: string; icon: typeof Activity }[] = [
    { id: 'monitor', label: 'Monitor Real-Time', icon: Activity },
    { id: 'collections', label: 'Manajemen Koleksi', icon: BookCopy },
    { id: 'circulation', label: 'Sirkulasi & Peminjaman', icon: ArrowLeftRight },
    { id: 'members', label: 'Data Anggota', icon: Users },
    { id: 'settings', label: 'Pengaturan & Cadangan', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 border border-slate-800">
            <p className="text-xs text-slate-400">Konsol Pustakawan</p>
            <p className="font-display text-base font-semibold">Dashboard Admin</p>
            <p className="font-mono-tabular text-xs text-slate-300">
              {metrics.availableBooks}/{metrics.totalBooks} eksemplar di rak
            </p>
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

          <div className="pt-2 border-t border-slate-200 hidden lg:block">
            <button
              type="button"
              onClick={onNavigateReports}
              className="w-full py-2.5 px-3.5 text-xs font-medium text-blue-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors text-left"
            >
              Buka Pelaporan Otomatis →
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header Breadcrumb + Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>MeowLibrary</span>
              <span>/</span>
              <span>Dashboard Admin</span>
              <span>/</span>
              <span className="font-medium text-slate-900">
                {navItems.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium whitespace-nowrap">
                <Radio className="w-3.5 h-3.5" />
                <span>{isRealtimeConnected ? 'Live Stream Aktif' : 'Sinkron Lokal'}</span>
              </span>
              <button
                type="button"
                onClick={openAddBookModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Koleksi</span>
              </button>
            </div>
          </div>

          {/* TAB 1: REAL-TIME MONITOR */}
          {activeTab === 'monitor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-slate-500">Total Transaksi</p>
                  <p className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-1">{state.loans.length}</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-slate-500">Sedang Dipinjam</p>
                  <p className="font-mono-tabular text-2xl font-semibold text-blue-900 mt-1">{metrics.activeCount}</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-slate-500">Keterlambatan Aktif</p>
                  <p
                    className={`font-mono-tabular text-2xl font-semibold mt-1 ${
                      metrics.overdueCount > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {metrics.overdueCount}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-slate-500">Denda Belum Lunas</p>
                  <p className="font-mono-tabular text-xl font-semibold text-slate-900 mt-1">
                    {formatCurrencyIDR(metrics.unpaidFineTotal)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Real-Time Activity Stream */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        Stream Transaksi Real-Time
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Memantau peminjaman, pengembalian, dan reservasi lintas sesi secara langsung
                      </p>
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-500 shrink-0">
                      {formatTimeOnly(state.lastSyncedAt)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200 max-h-[380px] overflow-y-auto">
                    {state.activities.map((act) => (
                      <div key={act.id} className="p-4 sm:px-5 space-y-1 hover:bg-slate-50/70">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900">
                            {act.summary} · <span className="font-normal text-slate-600">{act.actorName} ({act.actorRole})</span>
                          </span>
                          <span className="font-mono-tabular text-slate-400 shrink-0">
                            {formatTimeOnly(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{act.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7-Day Circulation Chart */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      Grafik Sirkulasi 7 Hari Terakhir
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Perbandingan peminjaman vs pengembalian harian</p>
                  </div>

                  <div className="h-52 flex items-end justify-between gap-2 pt-4 border-b border-slate-200 pb-2">
                    {chartDays.map((day, idx) => {
                      const borrowHeight = Math.round((day.borrows / maxChartVal) * 140);
                      const returnHeight = Math.round((day.returns / maxChartVal) * 140);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div className="flex items-end gap-1 h-[145px]">
                            <div
                              className="w-3 bg-blue-900 rounded-t transition-all"
                              style={{ height: `${Math.max(4, borrowHeight)}px` }}
                              title={`Pinjam: ${day.borrows}`}
                            />
                            <div
                              className="w-3 bg-emerald-600 rounded-t transition-all"
                              style={{ height: `${Math.max(4, returnHeight)}px` }}
                              title={`Kembali: ${day.returns}`}
                            />
                          </div>
                          <span className="text-[11px] font-mono-tabular text-slate-500">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-blue-900 rounded-sm inline-block" /> Pinjam
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm inline-block" /> Kembali
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onNavigateReports}
                      className="text-blue-900 font-medium hover:underline"
                    >
                      Lihat Laporan →
                    </button>
                  </div>
                </div>
              </div>

              {/* Overdue Watchlist */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Pemantauan Keterlambatan ({metrics.overdueLoans.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('circulation');
                      setLoanFilter('Terlambat');
                    }}
                    className="text-xs font-medium text-blue-900 hover:underline"
                  >
                    Buka di Loket Sirkulasi
                  </button>
                </div>
                {metrics.overdueLoans.length === 0 ? (
                  <p className="p-6 text-xs text-slate-500 text-center">Tidak ada pinjaman terlambat saat ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                          <th className="py-3 px-4">ID</th>
                          <th className="py-3 px-4">Anggota</th>
                          <th className="py-3 px-4">Buku</th>
                          <th className="py-3 px-4">Jatuh Tempo</th>
                          <th className="py-3 px-4 text-right">Denda Berjalan</th>
                          <th className="py-3 px-4 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {metrics.overdueLoans.map((loan) => (
                          <tr key={loan.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono-tabular text-slate-700">{loan.id}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {loan.memberName}{' '}
                              <span className="font-mono-tabular text-slate-500 font-normal">({loan.memberCode})</span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{loan.bookTitle}</td>
                            <td className="py-3 px-4 font-mono-tabular text-red-700">{formatDateShort(loan.dueAt)}</td>
                            <td className="py-3 px-4 font-mono-tabular text-right font-semibold text-red-700">
                              {formatCurrencyIDR(loan.fineAmount)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = returnBook(loan.id, true);
                                  onNotify(res.message, res.ok);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap"
                              >
                                Terima & Lunasi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COLLECTION MANAGEMENT */}
          {activeTab === 'collections' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">Manajemen Koleksi Buku</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Kelola katalog, jumlah eksemplar, dan lokasi rak fisik</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="Cari judul, ISBN, rak..."
                      className="pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openAddBookModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Koleksi Baru</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">Buku</th>
                      <th className="py-3 px-4">ISBN</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Rak</th>
                      <th className="py-3 px-4 text-right">Stok</th>
                      <th className="py-3 px-4 text-right">Dipinjam</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <BookCover src={book.coverUrl} title={book.title} className="w-9 h-12 rounded shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-900">{book.title}</p>
                              <p className="text-slate-500">
                                {book.author} · {book.year}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">{book.isbn}</td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{book.category}</td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                          {book.shelfLocation}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap font-medium text-slate-900">
                          {book.availableCopies}/{book.totalCopies}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap text-slate-600">
                          {book.borrowCount}×
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditBookModal(book)}
                              className="p-1.5 text-slate-600 hover:text-blue-900 border border-slate-200 rounded hover:bg-slate-50"
                              aria-label={`Edit ${book.title}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = deleteBook(book.id);
                                onNotify(res.message, res.ok);
                              }}
                              className="p-1.5 text-slate-600 hover:text-red-700 border border-slate-200 rounded hover:bg-slate-50"
                              aria-label={`Hapus ${book.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CIRCULATION & RESERVATIONS */}
          {activeTab === 'circulation' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                    {(['Semua', 'Dipinjam', 'Terlambat', 'Dikembalikan'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setLoanFilter(status)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          loanFilter === status
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const firstMember = state.users.find((u) => u.role === 'member' && u.status === 'Aktif');
                      const firstBook = state.books.find((b) => b.availableCopies > 0);
                      setDeskMemberId(firstMember?.id || '');
                      setDeskBookId(firstBook?.id || '');
                      setDeskDays(state.settings.defaultLoanDays);
                      setDeskBorrowOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Peminjaman (Loket)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Peminjam</th>
                        <th className="py-3 px-4">Judul Buku</th>
                        <th className="py-3 px-4">Tenggat</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Denda</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {filteredLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">{loan.id}</td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{loan.memberName}</p>
                            <p className="font-mono-tabular text-slate-500">{loan.memberCode}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-800">{loan.bookTitle}</td>
                          <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {formatDateShort(loan.dueAt)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusText status={loan.status} />
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-right whitespace-nowrap">
                            {formatCurrencyIDR(loan.fineAmount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {loan.status !== 'Dikembalikan' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = returnBook(loan.id, true);
                                  onNotify(res.message, res.ok);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md"
                              >
                                Proses Kembali
                              </button>
                            ) : loan.fineAmount > 0 && !loan.finePaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = markFinePaid(loan.id);
                                  onNotify(res.message, res.ok);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded-md"
                              >
                                Lunasi Denda
                              </button>
                            ) : (
                              <span className="text-slate-400">Selesai</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reservations Queue */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Antrean Reservasi Buku ({pendingReservations.length})
                  </h3>
                </div>
                {pendingReservations.length === 0 ? (
                  <p className="p-6 text-xs text-slate-500 text-center">Tidak ada antrean reservasi saat ini.</p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {pendingReservations.map((res) => (
                      <div key={res.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{res.bookTitle}</p>
                          <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                            {res.id} · Pemohon: {res.memberName} ({res.memberCode}) · {formatDateShort(res.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <StatusText status={res.status} />
                          <button
                            type="button"
                            onClick={() => {
                              const r = fulfillReservation(res.id);
                              onNotify(r.message, r.ok);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap"
                          >
                            Serahkan Buku
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const r = cancelReservation(res.id);
                              onNotify(r.message, r.ok);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERS */}
          {activeTab === 'members' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">Direktori Anggota MeowLibrary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Pantau kuota pinjam, status keanggotaan, dan tanggungan denda</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama atau kode..."
                      className="pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMemberModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Anggota Baru</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama & Kontak</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4 text-right">Pinjaman Aktif</th>
                      <th className="py-3 px-4 text-right">Denda Aktif</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {membersList.map((member) => {
                      const activeLoanCount = state.loans.filter(
                        (l) => l.memberId === member.id && l.status !== 'Dikembalikan'
                      ).length;
                      const memberUnpaidFine = state.loans
                        .filter((l) => l.memberId === member.id && !l.finePaid)
                        .reduce((s, l) => s + l.fineAmount, 0);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono-tabular text-slate-700 whitespace-nowrap">
                            {member.memberCode}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{member.name}</p>
                            <p className="text-slate-500">
                              {member.email} · {member.phone}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{member.department}</td>
                          <td className="py-3 px-4 font-mono-tabular text-right">
                            {activeLoanCount}/{state.settings.maxActiveLoans}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-right">
                            {formatCurrencyIDR(memberUnpaidFine)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusText status={member.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const res = toggleMemberStatus(member.id);
                                onNotify(res.message, res.ok);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                            >
                              {member.status === 'Aktif' ? 'Tangguhkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & BACKUP */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = updateSettings(settingsDraft);
                  onNotify(res.message, res.ok);
                }}
                className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h3 className="font-display text-base font-semibold text-slate-900">Kebijakan Sirkulasi & Denda</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Maksimal Pinjaman Aktif per Anggota
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settingsDraft.maxActiveLoans}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, maxActiveLoans: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Durasi Pinjam Standar (Hari)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={settingsDraft.defaultLoanDays}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, defaultLoanDays: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Denda Harian (IDR)</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={settingsDraft.dailyFineIdr}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, dailyFineIdr: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Maksimal Perpanjangan</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={settingsDraft.maxRenewals}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, maxRenewals: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsDraft.autoReportEnabled}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, autoReportEnabled: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span>Aktifkan generator snapshot pelaporan otomatis periodik</span>
                </label>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                  >
                    Simpan Kebijakan
                  </button>
                </div>
              </form>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-semibold text-slate-900">Cadangan & Pemulihan Basis Data</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ekspor seluruh katalog, data anggota, dan riwayat transaksi ke berkas JSON untuk arsip atau migrasi lintas perangkat.
                </p>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadJsonBackup}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Cadangan JSON</span>
                  </button>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pulihkan dari Berkas JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetDemoData();
                      onNotify('Data perpustakaan dikembalikan ke kondisi awal.', true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Data Awal</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOOK ADD / EDIT MODAL */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingBook ? 'Edit Data Koleksi' : 'Tambah Koleksi Buku Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBook} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Judul Buku</label>
                  <input
                    type="text"
                    required
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Penulis</label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    required
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value as BookCategory })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Lokasi Rak</label>
                  <input
                    type="text"
                    required
                    value={bookForm.shelfLocation}
                    onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Terbit</label>
                  <input
                    type="number"
                    value={bookForm.year}
                    onChange={(e) => setBookForm({ ...bookForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah Eksemplar</label>
                  <input
                    type="number"
                    min={1}
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm({ ...bookForm, totalCopies: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tema Sampul Kurasi</label>
                  <select
                    value={bookForm.coverUrl}
                    onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={COVER_PRESETS.fiction}>Sastra & Toko Buku Senja</option>
                    <option value={COVER_PRESETS.astronomy}>Astronomi & Peta Langit</option>
                    <option value={COVER_PRESETS.architecture}>Arsitektur & Monograf Ruang</option>
                    <option value={COVER_PRESETS.botanical}>Botani & Herbarium Arsip</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sinopsis</label>
                  <textarea
                    rows={3}
                    value={bookForm.synopsis}
                    onChange={(e) => setBookForm({ ...bookForm, synopsis: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                >
                  {editingBook ? 'Simpan Perubahan' : 'Tambahkan Koleksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUNTER BORROW MODAL */}
      {deskBorrowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-slate-900">Catat Peminjaman di Loket</h3>
              <button
                type="button"
                onClick={() => setDeskBorrowOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDeskBorrowSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Anggota</label>
                <select
                  required
                  value={deskMemberId}
                  onChange={(e) => setDeskMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {state.users
                    .filter((u) => u.role === 'member')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.memberCode} — {u.name} ({u.status})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Buku Tersedia</label>
                <select
                  required
                  value={deskBookId}
                  onChange={(e) => setDeskBookId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {state.books
                    .filter((b) => b.availableCopies > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (Sisa {b.availableCopies})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Durasi Pinjam (Hari)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={deskDays}
                  onChange={(e) => setDeskDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeskBorrowOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                >
                  Proses Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MEMBER MODAL */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-slate-900">Tambah Anggota Baru</h3>
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Telepon</label>
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit / Fakultas</label>
                <input
                  type="text"
                  value={memberForm.department}
                  onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
