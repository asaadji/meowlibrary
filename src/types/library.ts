export type BookCategory =
  | 'Sastra & Fiksi'
  | 'Sains & Astronomi'
  | 'Arsitektur & Desain'
  | 'Botani & Sejarah'
  | 'Teknologi & Sistem';

export interface BookReview {
  id: string;
  memberId: string;
  memberName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Book {
  id: string;
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
  availableCopies: number;
  coverUrl: string;
  synopsis: string;
  excerpt: string;
  borrowCount: number;
  rating: number;
  reviews: BookReview[];
}

export type UserRole = 'member' | 'admin';
export type MemberStatus = 'Aktif' | 'Ditangguhkan';

export interface UserAccount {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: MemberStatus;
  department: string;
  joinedAt: string;
  bookmarks: string[];
}

export type LoanStatus = 'Dipinjam' | 'Terlambat' | 'Dikembalikan';

export interface LoanTransaction {
  id: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  renewalsCount: number;
  status: LoanStatus;
  fineAmount: number;
  finePaid: boolean;
  processedBy: string;
}

export type ReservationStatus = 'Menunggu' | 'Siap Diambil' | 'Selesai' | 'Dibatalkan';

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  createdAt: string;
  status: ReservationStatus;
}

export type ActivityType =
  | 'BORROW'
  | 'RETURN'
  | 'RENEW'
  | 'RESERVE'
  | 'FINE_PAID'
  | 'COLLECTION_ADD'
  | 'COLLECTION_EDIT'
  | 'MEMBER_ADD'
  | 'REPORT_GEN';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: ActivityType;
  actorName: string;
  actorRole: 'Admin' | 'Member' | 'Sistem';
  memberId?: string;
  bookId?: string;
  summary: string;
  detail: string;
}

export type ReportPeriod = 'Harian' | 'Mingguan' | 'Bulanan' | 'Audit Keterlambatan';

export interface AutoReportSnapshot {
  id: string;
  generatedAt: string;
  period: ReportPeriod;
  trigger: 'Otomatis Terjadwal' | 'Manual';
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  totalFines: number;
  collectedFines: number;
  topBookTitle: string;
  utilizationRate: number;
}

export interface LibrarySettings {
  libraryName: string;
  maxActiveLoans: number;
  defaultLoanDays: number;
  dailyFineIdr: number;
  maxRenewals: number;
  autoReportEnabled: boolean;
  autoReportScheduleLabel: string;
}

export interface LibraryState {
  books: Book[];
  users: UserAccount[];
  loans: LoanTransaction[];
  reservations: Reservation[];
  activities: ActivityEvent[];
  reportSnapshots: AutoReportSnapshot[];
  settings: LibrarySettings;
  lastSyncedAt: string;
}
