import React, { useState } from 'react';
import { X, ShieldCheck, User, UserPlus } from 'lucide-react';
import { useLibrary } from '../store/libraryStore';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string, ok?: boolean) => void;
  onNavigate?: (view: 'catalog' | 'member' | 'admin' | 'reports') => void;
}

export function AccountModal({ isOpen, onClose, onNotify, onNavigate }: AccountModalProps) {
  const { state, currentUser, switchUser, registerMember } = useLibrary();
  const [tab, setTab] = useState<'switch' | 'register'>('switch');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (userId: string, role: 'admin' | 'member') => {
    switchUser(userId);
    const chosen = state.users.find((u) => u.id === userId);
    onNotify(`Masuk sebagai ${chosen?.name || 'Pengguna'} (${role === 'admin' ? 'Admin' : 'Member'}).`, true);
    if (onNavigate) {
      onNavigate(role === 'admin' ? 'admin' : 'member');
    }
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerMember({ name, email, phone, department });
    onNotify(res.message, res.ok);
    if (res.ok && res.user) {
      switchUser(res.user.id);
      setName('');
      setEmail('');
      setPhone('');
      setDepartment('');
      if (onNavigate) onNavigate('member');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Akun dan Peran"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">Portal Akun MeowLibrary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aktif saat ini: {currentUser.name} · {currentUser.memberCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal akun"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('switch')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'switch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Akun Demo (Admin / Member)
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Anggota Baru
            </button>
          </div>
        </div>

        {tab === 'switch' ? (
          <div className="p-6 max-h-[65vh] overflow-y-auto divide-y divide-slate-200">
            {state.users.map((user) => {
              const isCurrent = user.id === currentUser.id;
              return (
                <div key={user.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        user.role === 'admin'
                          ? 'bg-blue-950 text-white border-blue-950'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        <span className="font-mono-tabular">{user.memberCode}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{user.role === 'admin' ? 'Administrator' : 'Member'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{user.department}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(user.id, user.role)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    {isCurrent ? 'Sedang Aktif' : 'Masuk'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Tania Permata"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tania@meowlibrary.id"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nomor Telepon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Unit / Kategori Anggota</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Mahasiswa / Peneliti / Umum"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar & Masuk</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
