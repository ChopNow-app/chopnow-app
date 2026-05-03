// Sprint 1 — Story 3.6 (Confirmation & Suivi Commande).

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-dvh bg-chop-warm p-4 text-chop-ink">
      <h1 className="text-2xl font-bold">Commande #{id}</h1>
      <p className="text-sm text-muted-foreground">
        Suivi en temps réel — en construction (Story 3.6).
      </p>
    </main>
  );
}
