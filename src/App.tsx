import { useEffect, useState } from 'react';
import { Menu, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Book } from './types/library';
import { LibraryProvider, useLibrary } from './store/libraryStore';
import { CatalogView } from './components/CatalogView';
import { MemberDashboardView } from './components/MemberDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { ReportsView } from './components/ReportsView';
import { BookDetailModal } from './components/BookDetailModal';
import { AccountModal } from './components/AccountModal';

type AppView = 'catalog' | 'member' | 'admin' | 'reports';

interface ToastState {
  message: string;
  ok: boolean;
}

function MeowLibraryShell() {
  const { currentUser } = useLibrary();
  const [view, setView] = useState<AppView>('catalog');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleNotify = (message: string, ok = true) => {
    setToast({ message, ok });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const navItems: { id: AppView; label: string }[] = [
    { id: 'catalog', label: 'Katalog' },
    { id: 'member', label: 'Dashboard Member' },
    { id: 'admin', label: 'Dashboard Admin' },
    { id: 'reports', label: 'Laporan Otomatis' },
  ];

  const handleNavigate = (target: AppView) => {
    setView(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('catalog')}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 rounded"
          >
            MeowLibrary
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-slate-900 border-blue-900'
                      : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 max-w-[200px] truncate"
            >
              Akun: {currentUser.name}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Buka menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg ${
                  view === item.id ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAccountModalOpen(true);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg mt-2"
            >
              Ganti / Daftar Akun ({currentUser.name})
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'catalog' && (
          <CatalogView
            onSelectBook={(book) => setSelectedBook(book)}
            onNotify={handleNotify}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'member' && (
          <MemberDashboardView
            onSelectBook={(book) => setSelectedBook(book)}
            onNotify={handleNotify}
            onNavigateCatalog={() => handleNavigate('catalog')}
          />
        )}
        {view === 'admin' && (
          <AdminDashboardView
            onNotify={handleNotify}
            onNavigateReports={() => handleNavigate('reports')}
          />
        )}
        {view === 'reports' && <ReportsView onNotify={handleNotify} />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MeowLibrary. Perpustakaan Digital & Manajemen Sirkulasi.</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('catalog')}
              className="hover:text-slate-900 transition-colors"
            >
              Katalog Koleksi
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('reports')}
              className="hover:text-slate-900 transition-colors"
            >
              Pelaporan Otomatis
            </button>
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Portal Akun
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onNotify={handleNotify}
      />

      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onNotify={handleNotify}
        onNavigate={handleNavigate}
      />

      {/* Non-intrusive Notification Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-start gap-3 no-print"
        >
          {toast.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <p className="text-xs leading-relaxed flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <MeowLibraryShell />
    </LibraryProvider>
  );
}
