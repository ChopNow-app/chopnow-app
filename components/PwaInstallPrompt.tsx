'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  // Lazy init avoids the set-state-in-effect anti-pattern.
  const [installed, setInstalled] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );

  React.useEffect(() => {
    if (installed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [installed]);

  if (installed || !event) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
        setEvent(null);
      }}
    >
      Installer ChopNow
    </Button>
  );
}
