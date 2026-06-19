'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AnimateInViewProps {
  children: React.ReactNode;
  className?: string;
  /** Extra delay on top of the enter transition, in ms. Use for staggered lists. */
  delay?: number;
  /** Translate distance before entering — default 24px. */
  distance?: number;
  as?: React.ElementType;
}

/**
 * Fades + slides content up when it enters the viewport (IntersectionObserver).
 * Fires once — no re-hiding on scroll-up.
 * Snaps immediately visible for prefers-reduced-motion users.
 */
export function AnimateInView({
  children,
  className,
  delay = 0,
  distance = 24,
  as: Tag = 'div',
}: AnimateInViewProps) {
  const ref = React.useRef<HTMLElement>(null);
  // Lazy initializer: on the client, snap to visible immediately for reduced-motion users
  // so the effect never needs to call setState synchronously inside its body.
  const [visible, setVisible] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  React.useEffect(() => {
    if (visible) return; // already visible (reduced-motion)
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(className)}
      style={{
        transition: `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${distance}px)`,
      }}
    >
      {children}
    </Tag>
  );
}
