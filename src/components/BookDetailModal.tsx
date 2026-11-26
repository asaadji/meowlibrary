import React, { useState } from 'react';
import { X, Bookmark, Star, BookOpen, Calendar, MapPin } from 'lucide-react';
import { Book } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { BookCover } from './BookCover';
import { formatDateShort } from '../utils/format';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onNotify: (msg: string, ok?: boolean) => void;
}

export function BookDetailModal({ book, onClose, onNotify }: BookDetailModalProps) {
  const { state, currentUser, toggleBookmark, borrowBook, reserveBook, addBookReview } = useLibrary();
  const [activeTab, setActiveTab] = useState<'sinopsis' | 'kutipan' | 'ulasan'>('sinopsis');
  const [durationDays, setDurationDays] = useState<number>(state.settings.defaultLoanDays);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');

  if (!book) return null;

  const liveBook = state.books.find((b) => b.id === book.id) || book;
  const isBookmarked = currentUser.bookmarks.includes(liveBook.id);
  const activeLoanByUser = state.loans.find(
    (l) => l.bookId === liveBook.id && l.memberId === currentUser.id && l.status !== 'Dikembalikan'
  );
  const dueDatePreview = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const handleBorrow = () => {
    const res = borrowBook(liveBook.id, durationDays);
    onNotify(res.message, res.ok);
    if (res.ok) onClose();
  };

  const handleReserve = () => {
    const res = reserveBook(liveBook.id);
    onNotify(res.message, res.ok);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addBookReview(liveBook.id, reviewRating, reviewComment);
    onNotify(res.message, res.ok);
    if (res.ok) setReviewComment('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail buku ${liveBook.title}`}
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <p className="text-xs text-slate-500 font-mono-tabular truncate">
            ISBN {liveBook.isbn} · {liveBook.shelfLocation}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                toggleBookmark(liveBook.id);
                onNotify(isBookmarked ? 'Dihapus dari daftar bacaan.' : 'Disimpan ke daftar bacaan.', true);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isBookmarked
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Tutup detail buku"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-4">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <BookCover src={liveBook.coverUrl} title={liveBook.title} author={liveBook.author} className="w-full h-full" />
            </div>
            <div className="space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span>Ketersediaan</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {liveBook.availableCopies} / {liveBook.totalCopies} eksemplar
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lokasi Rak
                </span>
                <span className="font-mono-tabular text-slate-900">{liveBook.shelfLocation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Dipinjam</span>
                <span className="font-mono-tabular text-slate-900">{liveBook.borrowCount} kali</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-xs text-slate-500">
                {liveBook.category} · {liveBook.year} · {liveBook.pages} halaman · {liveBook.language}
              </p>
              <h2 className="font-display text-2xl font-semibold text-slate-900 mt-1 leading-snug">
                {liveBook.title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Oleh <span className="font-medium text-slate-900">{liveBook.author}</span> · {liveBook.publisher}
              </p>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mt-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('sinopsis')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'sinopsis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sinopsis & Pinjam
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('kutipan')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'kutipan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pratinjau Bacaan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ulasan')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'ulasan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ulasan ({liveBook.reviews.length})
                </button>
              </div>

              {activeTab === 'sinopsis' && (
                <div className="mt-4 space-y-5">
                  <p className="text-sm leading-relaxed text-slate-700">{liveBook.synopsis}</p>

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    {activeLoanByUser ? (
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        Anda sedang meminjam buku ini ({activeLoanByUser.id}). Batas pengembalian:{' '}
                        <span className="font-semibold text-slate-900">{formatDateShort(activeLoanByUser.dueAt)}</span>.
                      </div>
                    ) : liveBook.availableCopies > 0 ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-medium text-slate-700 inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Durasi Peminjaman
                          </span>
                          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                            {[7, 14].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDurationDays(d)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                  durationDays === d
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {d} Hari
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Peminjam: <span className="font-medium text-slate-800">{currentUser.name}</span> · Tenggat kembali:{' '}
                          <span className="font-mono-tabular font-medium text-slate-800">
                            {formatDateShort(dueDatePreview)}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={handleBorrow}
                          className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Pinjam Buku Sekarang
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          Seluruh eksemplar sedang dipinjam. Masuk antrean reservasi untuk mendapat prioritas saat buku kembali.
                        </p>
                        <button
                          type="button"
                          onClick={handleReserve}
                          className="w-full py-2.5 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Masuk Antrean Reservasi
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'kutipan' && (
                <div className="mt-4 p-5 bg-[#FAF9F6] border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Pratinjau Digital MeowLibrary</span>
                  </div>
                  <p className="font-display text-base leading-relaxed text-slate-800 italic">
                    “{liveBook.excerpt}”
                  </p>
                </div>
              )}

              {activeTab === 'ulasan' && (
                <div className="mt-4 space-y-4">
                  <form onSubmit={handleReviewSubmit} className="space-y-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">Beri Penilaian</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-1"
                            aria-label={`Beri ${star} bintang`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= reviewRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Tulis catatan atau ulasan singkat Anda tentang buku ini..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Kirim Ulasan
                    </button>
                  </form>

                  {liveBook.reviews.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      Belum ada ulasan pembaca untuk koleksi ini.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                      {liveBook.reviews.map((rev) => (
                        <div key={rev.id} className="py-3 first:pt-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900">{rev.memberName}</span>
                            <span className="font-mono-tabular text-slate-500">
                              {rev.rating}/5 · {formatDateShort(rev.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
