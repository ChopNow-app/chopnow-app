'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Download,
  MapPin,
  ShoppingBag,
  Share,
  PlusSquare,
  Smartphone,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android-chrome' | 'ios-safari' | 'unsupported' | 'unknown';

/**
 * App-store-style install popup for the PWA. Replaces the bare "Installer
 * TChopNow" button on the splash with a richer surface — icon + slogan,
 * 3 value bullets, install CTA. Two platform paths inside:
 *
 *   - Android Chrome (or any Chromium with beforeinstallprompt support)
 *     → CTA calls event.prompt() → Chrome's native install dialog appears.
 *       Closest thing to an app-store install we can produce: Chrome shows
 *       the icon, name, and an INSTALL button.
 *
 *   - iOS Safari (no beforeinstallprompt; Apple forbids programmatic install)
 *     → CTA expands the modal to show a 4-step guide with the share icon
 *       called out. Standard pattern used by Pinterest, Twitter, etc.
 *
 *   - Already installed (display-mode: standalone) → component renders
 *     nothing (user can't re-install an installed PWA).
 *
 *   - Unsupported browser (Firefox desktop, older browsers, in-app webviews)
 *     → CTA disabled, surfaces a friendly "open in Chrome/Safari mobile"
 *       hint.
 */
export function PwaInstallModal() {
  const [open, setOpen] = React.useState(false);
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState<boolean>(false);
  const [platform, setPlatform] = React.useState<Platform>('unknown');
  const [iosStepsOpen, setIosStepsOpen] = React.useState(false);

  // Detect environment once on mount. Lives client-side because all the
  // checks are browser globals.
  React.useEffect(() => {
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(isInstalled);

    const ua = window.navigator.userAgent || '';
    const isIos =
      /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    // Standalone Chrome on Android matches; in-app webviews (e.g. Facebook,
    // Instagram, Messenger browsers) do NOT fire beforeinstallprompt and
    // can't install — we treat them as unsupported.
    const looksLikeWebview =
      / FBAN| FBAV| FB_IAB| Instagram| Line\/| MicroMessenger|TwitterAndroid/.test(ua);
    if (isIos) setPlatform('ios-safari');
    else if (looksLikeWebview) setPlatform('unsupported');
    else setPlatform('android-chrome');

    // Capture the install event when Chrome offers it. We don't decide
    // unsupported-vs-supported here; the platform check above already does.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // After a successful install Chrome fires `appinstalled` — hide ourselves.
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleAndroidInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setOpen(false);
    }
    setInstallEvent(null);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Download className="h-4 w-4" aria-hidden />
        Installer
      </Button>

      {open ? (
        <Modal onClose={() => setOpen(false)}>
          <AppCard />

          <ul className="mt-5 space-y-2.5">
            <Bullet icon={<Clock className="h-4 w-4" aria-hidden />} label="Livraison en 30 min" />
            <Bullet
              icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
              label="Paiement MTN MoMo + Orange Money"
            />
            <Bullet
              icon={<MapPin className="h-4 w-4" aria-hidden />}
              label="Vendeurs autour de toi"
            />
          </ul>

          <div className="mt-6">
            {platform === 'ios-safari' ? (
              <IosFlow open={iosStepsOpen} setOpen={setIosStepsOpen} />
            ) : platform === 'android-chrome' ? (
              <AndroidFlow onInstall={handleAndroidInstall} hasEvent={!!installEvent} />
            ) : platform === 'unsupported' ? (
              <UnsupportedHint />
            ) : (
              <div className="h-12 animate-pulse rounded-full bg-chop-surface-gray" />
            )}
          </div>

          <p className="mt-5 text-center text-[11px] font-medium text-chop-ink-secondary">
            Aucun téléchargement depuis l&apos;App Store ou Play Store. Aucune publicité.
          </p>
        </Modal>
      ) : null}
    </>
  );
}

function AppCard() {
  return (
    <header className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-chop-red shadow-card">
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tracking-tight text-white">
          TC
        </span>
        <span
          aria-hidden
          className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full bg-white/15 blur-md"
        />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-extrabold leading-tight tracking-tight">TChopNow</p>
        <p className="mt-0.5 text-[13px] font-medium text-chop-ink-secondary">
          Mange sans attendre.
        </p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-chop-ink-secondary/70">
          Douala · MoMo · gratuit
        </p>
      </div>
    </header>
  );
}

function Bullet({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-chop-warm px-3 py-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chop-red-light text-chop-red">
        {icon}
      </span>
      <span className="text-[13px] font-semibold">{label}</span>
    </li>
  );
}

function AndroidFlow({
  onInstall,
  hasEvent,
}: {
  onInstall: () => Promise<void>;
  hasEvent: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onInstall}
        disabled={!hasEvent}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-full bg-chop-red px-5 py-3.5 text-[15px] font-bold text-white shadow-card transition-colors',
          hasEvent ? 'hover:bg-chop-red/90' : 'opacity-60',
        )}
      >
        <Download className="h-5 w-5" aria-hidden />
        Installer
      </button>
      {!hasEvent ? (
        <p className="mt-2 text-center text-[11px] text-chop-ink-secondary">
          Chrome prépare l&apos;installation… patiente une seconde et tape à nouveau si rien ne se
          passe.
        </p>
      ) : null}
    </>
  );
}

function IosFlow({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-chop-red px-5 py-3.5 text-[15px] font-bold text-white shadow-card transition-colors hover:bg-chop-red/90"
      >
        <Download className="h-5 w-5" aria-hidden />
        Voir comment installer
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-chop-ink/10 bg-chop-card-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-chop-red" aria-hidden />
        <p className="text-[12px] font-bold uppercase tracking-widest text-chop-ink-secondary">
          Installation iPhone
        </p>
      </div>
      <ol className="space-y-3">
        <Step
          n="1"
          body={
            <>
              Tape sur l&apos;icône{' '}
              <Share className="mx-0.5 inline-block h-3.5 w-3.5" aria-hidden />
              <span className="font-semibold"> Partager</span> en bas de Safari
            </>
          }
        />
        <Step n="2" body={<>Fais défiler le menu vers le bas</>} />
        <Step
          n="3"
          body={
            <>
              Tape <span className="font-semibold">Sur l&apos;écran d&apos;accueil</span>{' '}
              <PlusSquare className="mx-0.5 inline-block h-3.5 w-3.5" aria-hidden />
            </>
          }
        />
        <Step
          n="4"
          body={
            <>
              Tape <span className="font-semibold">Ajouter</span> en haut à droite — l&apos;icône
              TChopNow apparaît sur ton écran d&apos;accueil
            </>
          }
        />
      </ol>
      <p className="mt-3 text-[11px] text-chop-ink-secondary">
        Ferme cette page puis ouvre l&apos;icône depuis ton écran d&apos;accueil pour démarrer
        l&apos;app.
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 text-[12px] font-semibold text-chop-ink-secondary underline"
      >
        ← Retour
      </button>
    </div>
  );
}

function Step({ n, body }: { n: string; body: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chop-red text-[12px] font-bold text-white">
        {n}
      </span>
      <span className="text-[13px] leading-snug text-chop-ink">{body}</span>
    </li>
  );
}

function UnsupportedHint() {
  return (
    <div className="rounded-2xl bg-chop-warm p-4 text-center">
      <p className="text-[13px] font-semibold">L&apos;installation n&apos;est pas disponible ici</p>
      <p className="mt-1 text-[12px] text-chop-ink-secondary">
        Ouvre <span className="font-mono">app.tchopnow.app</span> dans{' '}
        <span className="font-semibold">Chrome (Android)</span> ou{' '}
        <span className="font-semibold">Safari (iPhone)</span> pour installer l&apos;app.
      </p>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // Close on Escape so a keyboard user is never trapped.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Mount the trigger lives inside the splash <header className="z-10"> which
  // creates a stacking context. Without a portal, the modal's z-50 is capped
  // by the header's z-10 and the splash hero (sibling z-10) paints over it.
  // Portaling to document.body breaks out of that context so the modal floats
  // above everything correctly.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Installer TChopNow"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-chop-card-white p-5 shadow-elevated sm:rounded-3xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-chop-surface-gray text-chop-ink-secondary transition-colors hover:bg-chop-warm hover:text-chop-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {/* sheet handle for mobile aesthetics */}
        <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-chop-neutral sm:hidden" />
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
