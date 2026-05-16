export const metadata = { title: 'TChopNow — Admin' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-widest text-destructive">
          TChopNow Admin
        </span>
      </header>
      <div className="container py-6">{children}</div>
    </div>
  );
}
