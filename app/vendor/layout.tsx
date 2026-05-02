export const metadata = { title: 'ChopNow — Vendeur' };

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-widest">ChopNow Vendeur</span>
      </header>
      <div className="container py-6">{children}</div>
    </div>
  );
}
