'use client';

import Link from 'next/link';

export default function MobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0f1930] flex justify-around items-center h-16 z-50 border-t border-[#40485d]/10">
      <Link href="/" className="flex flex-col items-center gap-1 text-[#69f6b8]">
        <span className="material-symbols-outlined">dashboard</span>
        <span className="text-[10px] font-medium">Dash</span>
      </Link>
      <Link href="/map" className="flex flex-col items-center gap-1 text-slate-400">
        <span className="material-symbols-outlined">map</span>
        <span className="text-[10px] font-medium">Map</span>
      </Link>
      <Link href="/vulnerability" className="flex flex-col items-center gap-1 text-slate-400">
        <span className="material-symbols-outlined">analytics</span>
        <span className="text-[10px] font-medium">Data</span>
      </Link>
      <Link href="/resident" className="flex flex-col items-center gap-1 text-slate-400">
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-medium">User</span>
      </Link>
    </div>
  );
}
