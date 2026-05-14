'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Story 3.15 — GPS permission refused fallback.
 *
 * When a user hits "denied" they often don't know how to re-enable
 * location for the site. The browsers' "site settings" UI is buried 2-3
 * taps deep and the steps differ on Android Chrome vs iOS Safari. We
 * surface concise step-by-step instructions on demand so the user can
 * self-rescue without a support ticket.
 *
 * Detection is best-effort — UA string is unreliable on Android, but the
 * payoff for getting it right outweighs the cost of a wrong default
 * (worst case: user sees Chrome steps on Firefox, scrolls to the right
 * section themselves).
 */
type Platform = 'ios-safari' | 'android-chrome' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
    return 'ios-safari';
  }
  if (/Android/.test(ua) && /Chrome/.test(ua)) {
    return 'android-chrome';
  }
  return 'desktop';
}

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  'android-chrome': {
    title: 'Chrome Android — réactiver la position',
    steps: [
      'Touche le ⋮ (3 points) en haut à droite du navigateur',
      'Paramètres → Paramètres des sites → Position',
      'Trouve « tchopnow.app » et passe à Autoriser',
      'Reviens ici et touche « Réessayer »',
    ],
  },
  'ios-safari': {
    title: 'Safari iPhone — réactiver la position',
    steps: [
      'Ouvre Réglages iPhone → Confidentialité & Sécurité',
      'Service de localisation → Safari (active)',
      'Reviens dans Safari, touche le AA dans la barre',
      'Paramètres du site Web → Position → Autoriser',
      'Touche « Réessayer » ici',
    ],
  },
  desktop: {
    title: 'Navigateur — réactiver la position',
    steps: [
      "Touche le cadenas 🔒 à gauche de l'URL",
      'Position → Autoriser',
      'Recharge la page',
      'Touche « Réessayer » ici',
    ],
  },
};

export function GpsHelpDialog({ onClose }: { onClose: () => void }) {
  const platform = React.useMemo(() => detectPlatform(), []);
  const guide = STEPS[platform];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="bg-card max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl">
        <header className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{guide.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-2xl leading-none text-muted-foreground"
          >
            ×
          </button>
        </header>

        <ol className="space-y-2 text-sm">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono font-bold text-chop-orange">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-xs text-muted-foreground">
          La position GPS aide le livreur à te trouver. Sans elle, on utilise une position
          approximative — le livreur t&apos;appellera pour confirmer le point exact.
        </p>

        <Button type="button" variant="outline" onClick={onClose} className="mt-4 w-full">
          J&apos;ai compris
        </Button>
      </div>
    </div>
  );
}
