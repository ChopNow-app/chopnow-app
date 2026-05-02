export const metadata = { title: 'ChopNow — Livreur' };

export default function LivreurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chop-ink text-chop-warm">
      <header className="border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-widest">ChopNow Livreur</span>
      </header>
      <div className="px-4 py-6">{children}</div>
    </div>
  );
}
