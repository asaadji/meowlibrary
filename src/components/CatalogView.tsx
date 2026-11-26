import { useMemo, useState } from 'react';
import { Search, ArrowRight, Bookmark, Star, BookOpen } from 'lucide-react';
import { Book, BookCategory } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { HERO_IMAGE_PATH } from '../data/seedData';
import { BookCover } from './BookCover';
import { StatusText } from './StatusText';

interface CatalogViewProps {
  onSelectBook: (book: Book) => void;
  onNotify: (msg: string, ok?: boolean) => void;
  onNavigate: (view: 'catalog' | 'member' | 'admin' | 'reports') => void;
}

const CATEGORIES: ('Semua' | BookCategory)[] = [
  'Semua',
  'Sastra & Fiksi',
  'Sains & Astronomi',
  'Arsitektur & Desain',
  'Botani & Sejarah',
  'Teknologi & Sistem',
];

export function CatalogView({ onSelectBook, onNotify, onNavigate }: CatalogViewProps) {
  const { state, currentUser, toggleBookmark, borrowBook, reserveBook } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | BookCategory>('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title'>('popular');

  const stats = useMemo(() => {
    const totalTitles = state.books.length;
    const totalAvailable = state.books.reduce((sum, b) => sum + b.availableCopies, 0);
    const activeLoans = state.loans.filter((l) => l.status !== 'Dikembalikan').length;
    const totalMembers = state.users.filter((u) => u.role === 'member').length;
    return { totalTitles, totalAvailable, activeLoans, totalMembers };
  }, [state.books, state.loans, state.users]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.books
      .filter((book) => {
        if (selectedCategory !== 'Semua' && book.category !== selectedCategory) return false;
        if (availabilityFilter === 'available' && book.availableCopies <= 0) return false;
        if (!q) return true;
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.isbn.toLowerCase().includes(q) ||
          book.shelfLocation.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.borrowCount - a.borrowCount;
        if (sortBy === 'newest') return b.year - a.year;
        return a.title.localeCompare(b.title);
      });
  }, [state.books, searchQuery, selectedCategory, availabilityFilter, sortBy]);

  const handleQuickAction = (book: Book) => {
    if (book.availableCopies > 0) {
      const res = borrowBook(book.id, state.settings.defaultLoanDays);
      onNotify(res.message, res.ok);
    } else {
      const res = reserveBook(book.id);
      onNotify(res.message, res.ok);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Editorial Hero Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-500 tracking-wide">
                Perpustakaan Digital Terpadu · Sirkulasi Real-Time
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-slate-900 leading-[1.15] text-balance">
                Temukan referensi terkurasi dan kelola peminjaman dalam satu ruang baca.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Jelajahi koleksi sastra, sains, arsitektur, dan sistem terdistribusi. Pantau status pinjaman, tenggat waktu, dan ketersediaan rak secara langsung bersama pustakawan.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul buku, nama penulis, kode rak, atau ISBN..."
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-900 transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#katalog-koleksi"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Jelajahi Katalog</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate(currentUser.role === 'admin' ? 'admin' : 'member')}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {currentUser.role === 'admin' ? 'Buka Dashboard Admin' : 'Buka Dashboard Member'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-slate-100">
            <img
              src={HERO_IMAGE_PATH}
              alt="Ruang baca MeowLibrary yang hangat dengan rak buku kayu dan kucing"
              referrerPolicy="no-referrer"
              className="w-full h-full lg:h-full object-cover"
            />
          </div>
        </div>

        {/* Full-Width 4-Column Operational Strip */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4 sm:px-6 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Judul Koleksi</span>
            <span className="font-mono-tabular text-xl font-semibold text-slate-900">{stats.totalTitles}</span>
          </div>
          <div className="p-4 sm:px-6 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Eksemplar Tersedia</span>
            <span className="font-mono-tabular text-xl font-semibold text-emerald-700">{stats.totalAvailable}</span>
          </div>
          <div className="p-4 sm:px-6 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Peminjaman Aktif</span>
            <span className="font-mono-tabular text-xl font-semibold text-blue-900">{stats.activeLoans}</span>
          </div>
          <div className="p-4 sm:px-6 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Anggota Terdaftar</span>
            <span className="font-mono-tabular text-xl font-semibold text-slate-900">{stats.totalMembers}</span>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="katalog-koleksi" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">Katalog Koleksi Buku</h2>
            <p className="text-xs text-slate-500 mt-1">
              Menampilkan <span className="font-mono-tabular font-medium text-slate-800">{filteredBooks.length}</span>{' '}
              dari {state.books.length} judul terindeks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  availabilityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Stok
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  availabilityFilter === 'available'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tersedia Saja
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'title')}
              aria-label="Urutkan koleksi"
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="popular">Urutkan: Terpopuler</option>
              <option value="newest">Urutkan: Tahun Terbaru</option>
              <option value="title">Urutkan: Judul A–Z</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-display text-lg font-medium text-slate-900">Koleksi tidak ditemukan</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Tidak ada buku yang cocok dengan kata kunci atau filter kategori Anda saat ini.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Semua');
                setAvailabilityFilter('all');
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              Atur Ulang Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredBooks.map((book) => {
              const isBookmarked = currentUser.bookmarks.includes(book.id);
              const isAvailable = book.availableCopies > 0;
              return (
                <article
                  key={book.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="w-full h-full block text-left focus:outline-none"
                        aria-label={`Lihat detail ${book.title}`}
                      >
                        <BookCover
                          src={book.coverUrl}
                          title={book.title}
                          author={book.author}
                          className="w-full h-full transition-transform duration-200 hover:scale-[1.02]"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toggleBookmark(book.id);
                          onNotify(
                            isBookmarked
                              ? `"${book.title}" dihapus dari daftar bacaan.`
                              : `"${book.title}" disimpan ke daftar bacaan.`,
                            true
                          );
                        }}
                        aria-label={isBookmarked ? 'Hapus bookmark' : 'Simpan ke daftar bacaan'}
                        className={`absolute top-3 right-3 p-2 rounded-lg border transition-colors ${
                          isBookmarked
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-500 truncate">
                        <span>{book.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-tabular">{book.year}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-tabular">{book.shelfLocation}</span>
                      </p>

                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="text-left block w-full group"
                      >
                        <h3 className="font-display text-base font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-900 transition-colors">
                          {book.title}
                        </h3>
                      </button>
                      <p className="text-xs text-slate-600 truncate">{book.author}</p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <StatusText status={isAvailable ? 'Tersedia' : 'Habis'} />
                      <span className="font-mono-tabular text-slate-600">
                        {book.availableCopies}/{book.totalCopies} eks ·{' '}
                        <span className="inline-flex items-center gap-0.5 text-slate-800">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 inline" />
                          {book.rating}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAction(book)}
                        className={`flex-1 py-2 px-3 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap ${
                          isAvailable ? 'bg-blue-900 hover:bg-blue-800' : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        {isAvailable ? 'Pinjam' : 'Reservasi'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
