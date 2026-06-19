'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { AuthRequired } from '@/components/ui/auth-required';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';

interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  displayName: string | null;
  role: 'CONSUMER' | 'VENDOR' | 'RIDER' | 'ADMIN';
  createdAt: string;
}

type State =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; profile: UserProfile }
  | { status: 'error'; message: string };

type NameFormValues = { displayName: string };

/**
 * Story 1.8 (MVP slice) — consumer self-service profile page.
 *
 * Scope: phone display, display-name edit, logout, navigation to saved
 * addresses. Out of scope (deferred): MoMo number change with OTP
 * re-confirmation on the new number, vendor/rider self-edits (those
 * have their own dashboards already), MoMo history.
 */
export function AccountPage() {
  const t = useTranslations('Account');
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('AuthRequired');
  const [state, setState] = React.useState<State>({ status: 'loading' });
  const [editingName, setEditingName] = React.useState(false);
  const [confirmingLogout, setConfirmingLogout] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiRaw.get<UserProfile>('/api/v1/users/me');
        if (!cancelled) setState({ status: 'ready', profile });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
      toast({ title: t('logoutDone'), description: t('logoutGoodbye') });
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <main className="container max-w-2xl py-10">
        <div className="h-32 animate-pulse rounded-lg border bg-background" />
      </main>
    );
  }
  if (state.status === 'unauthenticated') {
    return (
      <AuthRequired
        theme="light"
        subtitle={tAuth('subtitleProfile')}
        loginHref="/login?next=/account"
        features={[
          { icon: '👤', label: tAuth('accountFeature1') },
          { icon: '📍', label: tAuth('accountFeature2') },
          { icon: '💳', label: tAuth('accountFeature3') },
          { icon: '🔔', label: tAuth('accountFeature4') },
        ]}
        reassurance={tAuth('reassurance')}
      />
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container max-w-2xl py-16 text-center">
        <p className="text-destructive">{state.message}</p>
      </main>
    );
  }

  const { profile } = state;

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container max-w-2xl py-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t('eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{profile.displayName ?? t('fallbackName')}</h1>
      </header>

      <section className="container max-w-2xl space-y-4">
        <div className="bg-card rounded-lg border p-4 text-sm">
          <p className="font-semibold">{t('whatsappNumberLabel')}</p>
          <p className="mt-0.5 font-mono text-muted-foreground">{profile.phone}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t('whatsappChangeNote')}</p>
        </div>

        <div className="bg-card rounded-lg border p-4 text-sm">
          {editingName ? (
            <NameEditor
              current={profile.displayName ?? ''}
              onCancel={() => setEditingName(false)}
              onSaved={(updated) => {
                setState({ status: 'ready', profile: updated });
                setEditingName(false);
              }}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t('displayNameLabel')}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {profile.displayName ?? t('displayNameEmpty')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingName(true)}
                >
                  {t('edit')}
                </Button>
              </div>
            </>
          )}
        </div>

        <Link
          href="/account/addresses"
          className="bg-card block rounded-lg border p-4 text-sm hover:bg-background"
        >
          <p className="font-semibold">{t('addressesHeading')}</p>
          <p className="mt-0.5 text-muted-foreground">{t('addressesNavBody')}</p>
        </Link>

        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive"
          onClick={() => setConfirmingLogout(true)}
        >
          {t('logout')}
        </Button>
      </section>

      <AlertDialog
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        title={t('logoutConfirm')}
        description={t('logoutConfirmBody')}
        confirmLabel={t('logout')}
        cancelLabel={tCommon('cancel')}
        onConfirm={doLogout}
        busy={loggingOut}
      />
    </main>
  );
}

function NameEditor({
  current,
  onSaved,
  onCancel,
}: {
  current: string;
  onSaved: (profile: UserProfile) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('Account');
  const tCommon = useTranslations('Common');
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const schema = React.useMemo(
    () =>
      z.object({
        displayName: z.string().min(2, t('displayNameMinError')).max(80),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: current },
  });

  const onSubmit = async (values: NameFormValues) => {
    setSaving(true);
    setServerError(null);
    try {
      const updated = await apiRaw.patch<UserProfile>('/api/v1/users/me', {
        displayName: values.displayName,
      });
      onSaved(updated);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : (err as Error).message;
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <label htmlFor="displayName" className="block text-sm font-semibold">
        {t('displayNameLabel')}
      </label>
      <Input
        id="displayName"
        autoComplete="name"
        placeholder={t('displayNamePlaceholder')}
        {...register('displayName')}
      />
      {errors.displayName ? (
        <p className="text-xs text-destructive">{errors.displayName.message}</p>
      ) : null}
      {serverError ? <p className="text-xs text-destructive">{serverError}</p> : null}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} size="sm" className="flex-1">
          {saving ? t('saving') : t('save')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
