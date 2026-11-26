import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityEvent,
  AutoReportSnapshot,
  Book,
  BookCategory,
  LibrarySettings,
  LibraryState,
  LoanTransaction,
  ReportPeriod,
  UserAccount,
} from '../types/library';
import { createInitialLibraryState, COVER_PRESETS } from '../data/seedData';
import { computeFineAmount } from '../utils/format';

const STORAGE_KEY = 'meowlibrary_state_v1';
const SESSION_USER_KEY = 'meowlibrary_active_user_id_v1';
const BROADCAST_CHANNEL_NAME = 'meowlibrary_realtime_sync';

interface ActionResult {
  ok: boolean;
  message: string;
}

interface NewBookPayload {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: BookCategory;
  shelfLocation: string;
  pages: number;
  language: string;
  totalCopies: number;
  coverUrl: string;
  synopsis: string;
  excerpt: string;
}

interface NewMemberPayload {
  name: string;
  email: string;
  phone: string;
  department: string;
}

interface LibraryContextValue {
  state: LibraryState;
  currentUser: UserAccount;
  isRealtimeConnected: boolean;
  switchUser: (userId: string) => void;
  registerMember: (payload: NewMemberPayload) => ActionResult & { user?: UserAccount };
  toggleBookmark: (bookId: string) => void;
  addBookReview: (bookId: string, rating: number, comment: string) => ActionResult;
  borrowBook: (bookId: string, durationDays?: number, targetMemberId?: string) => ActionResult;
  returnBook: (loanId: string, payFineNow?: boolean) => ActionResult;
  renewLoan: (loanId: string) => ActionResult;
  reserveBook: (bookId: string) => ActionResult;
  cancelReservation: (reservationId: string) => ActionResult;
  fulfillReservation: (reservationId: string) => ActionResult;
  markFinePaid: (loanId: string) => ActionResult;
  addBook: (payload: NewBookPayload) => ActionResult;
  updateBook: (bookId: string, updates: Partial<NewBookPayload>) => ActionResult;
  deleteBook: (bookId: string) => ActionResult;
  toggleMemberStatus: (memberId: string) => ActionResult;
  updateSettings: (updates: Partial<LibrarySettings>) => ActionResult;
  generateAutoReport: (period: ReportPeriod, trigger?: 'Otomatis Terjadwal' | 'Manual') => AutoReportSnapshot;
  resetDemoData: () => void;
  importStateJson: (jsonText: string) => ActionResult;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function normalizeLoansWithLiveFines(rawState: LibraryState): LibraryState {
  const dailyFine = rawState.settings?.dailyFineIdr ?? 2000;
  const nowMs = Date.now();
  const updatedLoans: LoanTransaction[] = rawState.loans.map((loan) => {
    if (loan.status === 'Dikembalikan') return loan;
    const dueMs = new Date(loan.dueAt).getTime();
    if (nowMs > dueMs) {
      return {
        ...loan,
        status: 'Terlambat',
        fineAmount: computeFineAmount(loan.dueAt, dailyFine),
      };
    }
    return {
      ...loan,
      status: 'Dipinjam',
      fineAmount: 0,
    };
  });
  return {
    ...rawState,
    loans: updatedLoans,
  };
}

function loadInitialState(): LibraryState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as LibraryState;
      if (parsed && Array.isArray(parsed.books) && Array.isArray(parsed.users)) {
        return normalizeLoansWithLiveFines(parsed);
      }
    }
  } catch {
    // Fallback to initial seed
  }
  const initial = normalizeLoansWithLiveFines(createInitialLibraryState());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignore storage quota errors
  }
  return initial;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>(() => loadInitialState());
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(SESSION_USER_KEY) || 'usr-mbr-1';
    } catch {
      return 'usr-mbr-1';
    }
  });
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  const channel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
    return null;
  }, []);

  const commitState = useCallback(
    (updater: (prev: LibraryState) => LibraryState) => {
      setState((prev) => {
        const next = normalizeLoansWithLiveFines({
          ...updater(prev),
          lastSyncedAt: new Date().toISOString(),
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota issues
        }
        if (channel) {
          channel.postMessage({ type: 'STATE_UPDATED', payload: next });
        }
        return next;
      });
    },
    [channel]
  );

  useEffect(() => {
    if (!channel) {
      setIsRealtimeConnected(false);
      return;
    }
    setIsRealtimeConnected(true);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STATE_UPDATED' && event.data?.payload) {
        setState(normalizeLoansWithLiveFines(event.data.payload as LibraryState));
      }
    };
    channel.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as LibraryState;
          setState(normalizeLoansWithLiveFines(parsed));
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [channel]);

  // Automatic overdue recalculation every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => normalizeLoansWithLiveFines(prev));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const currentUser = useMemo(() => {
    return state.users.find((u) => u.id === activeUserId) || state.users[1] || state.users[0];
  }, [state.users, activeUserId]);

  const switchUser = useCallback((userId: string) => {
    setActiveUserId(userId);
    try {
      localStorage.setItem(SESSION_USER_KEY, userId);
    } catch {
      // Ignore
    }
  }, []);

  const registerMember = useCallback(
    (payload: NewMemberPayload): ActionResult & { user?: UserAccount } => {
      const emailClean = payload.email.trim().toLowerCase();
      if (!payload.name.trim() || !emailClean) {
        return { ok: false, message: 'Nama lengkap dan email wajib diisi.' };
      }
      if (state.users.some((u) => u.email.toLowerCase() === emailClean)) {
        return { ok: false, message: 'Email sudah terdaftar sebagai anggota.' };
      }

      const memberNumber = String(state.users.filter((u) => u.role === 'member').length + 1).padStart(3, '0');
      const newUser: UserAccount = {
        id: `usr-mbr-${Date.now()}`,
        memberCode: `MBR-2026-${memberNumber}`,
        name: payload.name.trim(),
        email: emailClean,
        phone: payload.phone.trim() || '-',
        role: 'member',
        status: 'Aktif',
        department: payload.department.trim() || 'Anggota Umum',
        joinedAt: new Date().toISOString(),
        bookmarks: [],
      };

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'MEMBER_ADD',
        actorName: newUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: newUser.id,
        summary: 'Pendaftaran anggota baru',
        detail: `${newUser.name} (${newUser.memberCode}) terdaftar pada unit ${newUser.department}.`,
      };

      commitState((prev) => ({
        ...prev,
        users: [newUser, ...prev.users],
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: `Anggota ${newUser.name} berhasil didaftarkan (${newUser.memberCode}).`, user: newUser };
    },
    [state.users, currentUser.role, commitState]
  );

  const toggleBookmark = useCallback(
    (bookId: string) => {
      commitState((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id !== currentUser.id) return u;
          const exists = u.bookmarks.includes(bookId);
          return {
            ...u,
            bookmarks: exists ? u.bookmarks.filter((id) => id !== bookId) : [...u.bookmarks, bookId],
          };
        }),
      }));
    },
    [currentUser.id, commitState]
  );

  const addBookReview = useCallback(
    (bookId: string, rating: number, comment: string): ActionResult => {
      if (!comment.trim()) {
        return { ok: false, message: 'Silakan tulis ulasan singkat sebelum mengirim.' };
      }
      commitState((prev) => ({
        ...prev,
        books: prev.books.map((book) => {
          if (book.id !== bookId) return book;
          const nextReviews = [
            {
              id: `rev-${Date.now()}`,
              memberId: currentUser.id,
              memberName: currentUser.name,
              rating,
              comment: comment.trim(),
              createdAt: new Date().toISOString(),
            },
            ...book.reviews,
          ];
          const avg = nextReviews.reduce((acc, r) => acc + r.rating, 0) / nextReviews.length;
          return {
            ...book,
            rating: Number(avg.toFixed(1)),
            reviews: nextReviews,
          };
        }),
      }));
      return { ok: true, message: 'Ulasan Anda berhasil ditambahkan.' };
    },
    [currentUser.id, currentUser.name, commitState]
  );

  const borrowBook = useCallback(
    (bookId: string, durationDays?: number, targetMemberId?: string): ActionResult => {
      const borrowerId = targetMemberId || currentUser.id;
      const borrower = state.users.find((u) => u.id === borrowerId);
      const book = state.books.find((b) => b.id === bookId);

      if (!borrower) return { ok: false, message: 'Data anggota tidak ditemukan.' };
      if (borrower.status === 'Ditangguhkan') {
        return { ok: false, message: `Akun ${borrower.name} sedang ditangguhkan. Selesaikan denda atau hubungi admin.` };
      }
      if (!book) return { ok: false, message: 'Koleksi buku tidak ditemukan.' };
      if (book.availableCopies <= 0) {
        return { ok: false, message: 'Stok buku saat ini habis. Anda dapat masuk ke antrean reservasi.' };
      }

      const activeLoansForMember = state.loans.filter(
        (l) => l.memberId === borrower.id && l.status !== 'Dikembalikan'
      );
      if (activeLoansForMember.length >= state.settings.maxActiveLoans) {
        return {
          ok: false,
          message: `Batas maksimal pinjaman aktif (${state.settings.maxActiveLoans} buku) untuk ${borrower.name} telah tercapai.`,
        };
      }
      if (activeLoansForMember.some((l) => l.bookId === book.id)) {
        return { ok: false, message: `${borrower.name} masih meminjam buku yang sama.` };
      }

      const days = durationDays || state.settings.defaultLoanDays;
      const now = new Date();
      const due = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const trxNum = 109 + state.loans.length;
      const newLoan: LoanTransaction = {
        id: `TRX-2026-${trxNum}`,
        bookId: book.id,
        bookTitle: book.title,
        memberId: borrower.id,
        memberName: borrower.name,
        memberCode: borrower.memberCode,
        borrowedAt: now.toISOString(),
        dueAt: due.toISOString(),
        renewalsCount: 0,
        status: 'Dipinjam',
        fineAmount: 0,
        finePaid: false,
        processedBy:
          currentUser.role === 'admin' ? `${currentUser.name} (Admin)` : 'Mandiri (Portal Member)',
      };

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: now.toISOString(),
        type: 'BORROW',
        actorName: currentUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: borrower.id,
        bookId: book.id,
        summary: 'Peminjaman buku baru',
        detail: `${borrower.name} meminjam "${book.title}" selama ${days} hari (${newLoan.id}).`,
      };

      commitState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === book.id
            ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1), borrowCount: b.borrowCount + 1 }
            : b
        ),
        loans: [newLoan, ...prev.loans],
        reservations: prev.reservations.map((r) =>
          r.bookId === book.id && r.memberId === borrower.id && r.status !== 'Selesai'
            ? { ...r, status: 'Selesai' }
            : r
        ),
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: `Berhasil meminjam "${book.title}" (${newLoan.id}).` };
    },
    [state.users, state.books, state.loans, state.settings, currentUser, commitState]
  );

  const returnBook = useCallback(
    (loanId: string, payFineNow = true): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan || loan.status === 'Dikembalikan') {
        return { ok: false, message: 'Transaksi peminjaman tidak valid atau sudah dikembalikan.' };
      }

      const nowIso = new Date().toISOString();
      const fine = computeFineAmount(loan.dueAt, state.settings.dailyFineIdr, nowIso);
      const hasWaitingRes = state.reservations.some(
        (r) => r.bookId === loan.bookId && r.status === 'Menunggu'
      );

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: nowIso,
        type: 'RETURN',
        actorName: currentUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: loan.memberId,
        bookId: loan.bookId,
        summary: fine > 0 ? 'Pengembalian buku dengan denda' : 'Pengembalian buku tepat waktu',
        detail: `${loan.memberName} mengembalikan "${loan.bookTitle}" (${loan.id})${
          fine > 0 ? ` · Denda Rp ${fine.toLocaleString('id-ID')}` : ''
        }.`,
      };

      commitState((prev) => {
        let notifiedNext = false;
        return {
          ...prev,
          books: prev.books.map((b) =>
            b.id === loan.bookId
              ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) }
              : b
          ),
          loans: prev.loans.map((l) =>
            l.id === loanId
              ? {
                  ...l,
                  status: 'Dikembalikan',
                  returnedAt: nowIso,
                  fineAmount: fine,
                  finePaid: fine === 0 ? true : payFineNow,
                }
              : l
          ),
          reservations: prev.reservations.map((r) => {
            if (!notifiedNext && hasWaitingRes && r.bookId === loan.bookId && r.status === 'Menunggu') {
              notifiedNext = true;
              return { ...r, status: 'Siap Diambil' };
            }
            return r;
          }),
          activities: [activity, ...prev.activities].slice(0, 80),
        };
      });

      return {
        ok: true,
        message:
          fine > 0
            ? `Buku dikembalikan. Denda keterlambatan Rp ${fine.toLocaleString('id-ID')} dicatat.`
            : `"${loan.bookTitle}" berhasil dikembalikan.`,
      };
    },
    [state.loans, state.settings.dailyFineIdr, state.reservations, currentUser, commitState]
  );

  const renewLoan = useCallback(
    (loanId: string): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan || loan.status === 'Dikembalikan') {
        return { ok: false, message: 'Pinjaman tidak aktif.' };
      }
      if (loan.status === 'Terlambat') {
        return { ok: false, message: 'Pinjaman yang sudah terlambat tidak dapat diperpanjang.' };
      }
      if (loan.renewalsCount >= state.settings.maxRenewals) {
        return {
          ok: false,
          message: `Batas perpanjangan (${state.settings.maxRenewals} kali) telah digunakan.`,
        };
      }
      const hasWaitingQueue = state.reservations.some(
        (r) => r.bookId === loan.bookId && r.status === 'Menunggu'
      );
      if (hasWaitingQueue) {
        return {
          ok: false,
          message: 'Buku ini sedang diantre anggota lain sehingga tidak dapat diperpanjang.',
        };
      }

      const nextDue = new Date(new Date(loan.dueAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'RENEW',
        actorName: currentUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: loan.memberId,
        bookId: loan.bookId,
        summary: 'Perpanjangan masa pinjam (+7 hari)',
        detail: `${loan.memberName} memperpanjang "${loan.bookTitle}" (${loan.id}).`,
      };

      commitState((prev) => ({
        ...prev,
        loans: prev.loans.map((l) =>
          l.id === loanId
            ? { ...l, dueAt: nextDue, renewalsCount: l.renewalsCount + 1 }
            : l
        ),
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: `Masa pinjam "${loan.bookTitle}" diperpanjang 7 hari.` };
    },
    [state.loans, state.settings.maxRenewals, state.reservations, currentUser, commitState]
  );

  const reserveBook = useCallback(
    (bookId: string): ActionResult => {
      const book = state.books.find((b) => b.id === bookId);
      if (!book) return { ok: false, message: 'Buku tidak ditemukan.' };
      if (currentUser.status === 'Ditangguhkan') {
        return { ok: false, message: 'Akun Anda sedang ditangguhkan.' };
      }
      const alreadyReserved = state.reservations.some(
        (r) =>
          r.bookId === bookId &&
          r.memberId === currentUser.id &&
          (r.status === 'Menunggu' || r.status === 'Siap Diambil')
      );
      if (alreadyReserved) {
        return { ok: false, message: 'Anda sudah berada dalam antrean reservasi buku ini.' };
      }

      const newResId = `RES-2026-${String(state.reservations.length + 12).padStart(3, '0')}`;
      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'RESERVE',
        actorName: currentUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: currentUser.id,
        bookId: book.id,
        summary: 'Reservasi antrean buku',
        detail: `${currentUser.name} memesan antrean untuk "${book.title}" (${newResId}).`,
      };

      commitState((prev) => ({
        ...prev,
        reservations: [
          {
            id: newResId,
            bookId: book.id,
            bookTitle: book.title,
            memberId: currentUser.id,
            memberName: currentUser.name,
            memberCode: currentUser.memberCode,
            createdAt: new Date().toISOString(),
            status: 'Menunggu',
          },
          ...prev.reservations,
        ],
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: `Berhasil masuk antrean reservasi "${book.title}".` };
    },
    [state.books, state.reservations, currentUser, commitState]
  );

  const cancelReservation = useCallback(
    (reservationId: string): ActionResult => {
      commitState((prev) => ({
        ...prev,
        reservations: prev.reservations.map((r) =>
          r.id === reservationId ? { ...r, status: 'Dibatalkan' } : r
        ),
      }));
      return { ok: true, message: 'Reservasi dibatalkan.' };
    },
    [commitState]
  );

  const fulfillReservation = useCallback(
    (reservationId: string): ActionResult => {
      const res = state.reservations.find((r) => r.id === reservationId);
      if (!res) return { ok: false, message: 'Data reservasi tidak ditemukan.' };
      return borrowBook(res.bookId, state.settings.defaultLoanDays, res.memberId);
    },
    [state.reservations, state.settings.defaultLoanDays, borrowBook]
  );

  const markFinePaid = useCallback(
    (loanId: string): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan) return { ok: false, message: 'Transaksi tidak ditemukan.' };
      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'FINE_PAID',
        actorName: currentUser.name,
        actorRole: currentUser.role === 'admin' ? 'Admin' : 'Member',
        memberId: loan.memberId,
        bookId: loan.bookId,
        summary: 'Pelunasan denda keterlambatan',
        detail: `Denda ${loan.memberName} sebesar Rp ${loan.fineAmount.toLocaleString('id-ID')} pada transaksi ${loan.id} telah lunas.`,
      };
      commitState((prev) => ({
        ...prev,
        loans: prev.loans.map((l) => (l.id === loanId ? { ...l, finePaid: true } : l)),
        activities: [activity, ...prev.activities].slice(0, 80),
      }));
      return { ok: true, message: 'Pembayaran denda berhasil dicatat.' };
    },
    [state.loans, currentUser, commitState]
  );

  const addBook = useCallback(
    (payload: NewBookPayload): ActionResult => {
      if (!payload.title.trim() || !payload.author.trim() || !payload.isbn.trim()) {
        return { ok: false, message: 'Judul, Penulis, dan ISBN wajib diisi.' };
      }
      const newBook: Book = {
        id: `book-${Date.now()}`,
        isbn: payload.isbn.trim(),
        title: payload.title.trim(),
        author: payload.author.trim(),
        publisher: payload.publisher.trim() || 'Pustaka MeowLibrary',
        year: Number(payload.year) || 2026,
        category: payload.category,
        shelfLocation: payload.shelfLocation.trim() || 'Rak A-01',
        pages: Number(payload.pages) || 200,
        language: payload.language.trim() || 'Indonesia',
        totalCopies: Math.max(1, Number(payload.totalCopies) || 1),
        availableCopies: Math.max(1, Number(payload.totalCopies) || 1),
        coverUrl: payload.coverUrl || COVER_PRESETS.fiction,
        synopsis: payload.synopsis.trim() || 'Koleksi terbaru perpustakaan digital MeowLibrary.',
        excerpt: payload.excerpt.trim() || 'Pratinjau bab pembuka tersedia di ruang baca digital MeowLibrary.',
        borrowCount: 0,
        rating: 5.0,
        reviews: [],
      };

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'COLLECTION_ADD',
        actorName: currentUser.name,
        actorRole: 'Admin',
        bookId: newBook.id,
        summary: 'Penambahan koleksi baru',
        detail: `Menambahkan "${newBook.title}" (${newBook.totalCopies} eksemplar) di ${newBook.shelfLocation}.`,
      };

      commitState((prev) => ({
        ...prev,
        books: [newBook, ...prev.books],
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: `"${newBook.title}" berhasil ditambahkan ke katalog.` };
    },
    [currentUser.name, commitState]
  );

  const updateBook = useCallback(
    (bookId: string, updates: Partial<NewBookPayload>): ActionResult => {
      const existing = state.books.find((b) => b.id === bookId);
      if (!existing) return { ok: false, message: 'Buku tidak ditemukan.' };
      const borrowedNow = existing.totalCopies - existing.availableCopies;
      const nextTotal =
        updates.totalCopies !== undefined ? Math.max(borrowedNow, Number(updates.totalCopies)) : existing.totalCopies;
      const nextAvailable = Math.max(0, nextTotal - borrowedNow);

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'COLLECTION_EDIT',
        actorName: currentUser.name,
        actorRole: 'Admin',
        bookId,
        summary: 'Pembaruan data koleksi',
        detail: `Memperbarui katalog "${updates.title || existing.title}" (Total stok: ${nextTotal}).`,
      };

      commitState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                ...updates,
                totalCopies: nextTotal,
                availableCopies: nextAvailable,
              }
            : b
        ),
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return { ok: true, message: 'Data koleksi berhasil diperbarui.' };
    },
    [state.books, currentUser.name, commitState]
  );

  const deleteBook = useCallback(
    (bookId: string): ActionResult => {
      const hasActiveLoans = state.loans.some(
        (l) => l.bookId === bookId && l.status !== 'Dikembalikan'
      );
      if (hasActiveLoans) {
        return {
          ok: false,
          message: 'Buku tidak dapat dihapus karena masih ada eksemplar yang sedang dipinjam.',
        };
      }
      commitState((prev) => ({
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
      }));
      return { ok: true, message: 'Koleksi berhasil dihapus dari katalog.' };
    },
    [state.loans, commitState]
  );

  const toggleMemberStatus = useCallback(
    (memberId: string): ActionResult => {
      const member = state.users.find((u) => u.id === memberId);
      if (!member) return { ok: false, message: 'Anggota tidak ditemukan.' };
      const nextStatus = member.status === 'Aktif' ? 'Ditangguhkan' : 'Aktif';
      commitState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === memberId ? { ...u, status: nextStatus } : u)),
      }));
      return { ok: true, message: `Status ${member.name} diubah menjadi ${nextStatus}.` };
    },
    [state.users, commitState]
  );

  const updateSettings = useCallback(
    (updates: Partial<LibrarySettings>): ActionResult => {
      commitState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
      }));
      return { ok: true, message: 'Pengaturan perpustakaan disimpan.' };
    },
    [commitState]
  );

  const generateAutoReport = useCallback(
    (period: ReportPeriod, trigger: 'Otomatis Terjadwal' | 'Manual' = 'Manual'): AutoReportSnapshot => {
      const totalCopies = state.books.reduce((acc, b) => acc + b.totalCopies, 0);
      const borrowedCopies = state.books.reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0);
      const utilizationRate = totalCopies > 0 ? Math.round((borrowedCopies / totalCopies) * 100) : 0;

      const activeLoans = state.loans.filter((l) => l.status !== 'Dikembalikan').length;
      const overdueLoans = state.loans.filter((l) => l.status === 'Terlambat').length;
      const totalFines = state.loans.reduce((acc, l) => acc + l.fineAmount, 0);
      const collectedFines = state.loans
        .filter((l) => l.finePaid)
        .reduce((acc, l) => acc + l.fineAmount, 0);

      const topBook = [...state.books].sort((a, b) => b.borrowCount - a.borrowCount)[0];

      const snapshot: AutoReportSnapshot = {
        id: `RPT-2026-${String(state.reportSnapshots.length + 90).padStart(3, '0')}`,
        generatedAt: new Date().toISOString(),
        period,
        trigger,
        totalLoans: state.loans.length,
        activeLoans,
        overdueLoans,
        totalFines,
        collectedFines,
        topBookTitle: topBook ? topBook.title : '-',
        utilizationRate,
      };

      const activity: ActivityEvent = {
        id: `act-${Date.now()}`,
        timestamp: snapshot.generatedAt,
        type: 'REPORT_GEN',
        actorName: trigger === 'Manual' ? currentUser.name : 'Penjadwal Otomatis',
        actorRole: trigger === 'Manual' ? (currentUser.role === 'admin' ? 'Admin' : 'Member') : 'Sistem',
        summary: `Laporan ${period} diterbitkan`,
        detail: `Snapshot ${snapshot.id} (${trigger}) · ${activeLoans} pinjaman aktif · ${overdueLoans} terlambat.`,
      };

      commitState((prev) => ({
        ...prev,
        reportSnapshots: [snapshot, ...prev.reportSnapshots].slice(0, 30),
        activities: [activity, ...prev.activities].slice(0, 80),
      }));

      return snapshot;
    },
    [state.books, state.loans, state.reportSnapshots.length, currentUser, commitState]
  );

  const resetDemoData = useCallback(() => {
    const initial = normalizeLoansWithLiveFines(createInitialLibraryState());
    commitState(() => initial);
  }, [commitState]);

  const importStateJson = useCallback(
    (jsonText: string): ActionResult => {
      try {
        const parsed = JSON.parse(jsonText) as LibraryState;
        if (!Array.isArray(parsed.books) || !Array.isArray(parsed.loans) || !Array.isArray(parsed.users)) {
          return { ok: false, message: 'Format file cadangan JSON tidak valid.' };
        }
        commitState(() => parsed);
        return { ok: true, message: 'Data cadangan perpustakaan berhasil dipulihkan.' };
      } catch {
        return { ok: false, message: 'Gagal membaca file JSON.' };
      }
    },
    [commitState]
  );

  const value: LibraryContextValue = {
    state,
    currentUser,
    isRealtimeConnected,
    switchUser,
    registerMember,
    toggleBookmark,
    addBookReview,
    borrowBook,
    returnBook,
    renewLoan,
    reserveBook,
    cancelReservation,
    fulfillReservation,
    markFinePaid,
    addBook,
    updateBook,
    deleteBook,
    toggleMemberStatus,
    updateSettings,
    generateAutoReport,
    resetDemoData,
    importStateJson,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return ctx;
}
