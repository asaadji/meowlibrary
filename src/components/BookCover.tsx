import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src: string;
  title: string;
  author?: string;
  className?: string;
}

export function BookCover({ src, title, author, className = '' }: BookCoverProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col justify-between bg-slate-900 text-slate-100 p-4 select-none border border-slate-800 ${className}`}
      >
        <div className="flex items-center justify-between text-slate-400">
          <BookOpen className="w-4 h-4" />
          <span className="font-mono-tabular text-[11px] tracking-wider uppercase">MeowLibrary</span>
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-sm font-semibold leading-snug line-clamp-3 text-white">{title}</p>
          {author && <p className="text-xs text-slate-400 truncate">{author}</p>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Sampul buku ${title}`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover bg-slate-100 ${className}`}
    />
  );
}
