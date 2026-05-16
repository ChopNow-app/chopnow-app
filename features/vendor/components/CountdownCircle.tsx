'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CountdownCircleProps {
  deadlineAt: string;
  ttlSeconds: number;
  onExpire?: () => void;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Counts down to an absolute deadline. SVG ring drains clockwise; remaining
 * seconds render in the center. Re-mount-safe — remaining time is computed
 * from `deadlineAt`, not from a from-now duration, so a tab reload mid-
 * countdown still shows the correct value.
 *
 * Color climbs through three tiers:
 *   - > 30% TTL remaining   → Chop Mboué (green)
 *   - > 10% TTL remaining   → amber-500
 *   - ≤ 10% TTL remaining   → Chop Red + subtle pulse on the seconds label
 */
export function CountdownCircle({
  deadlineAt,
  ttlSeconds,
  onExpire,
  size = 144,
  strokeWidth = 10,
  className,
}: CountdownCircleProps) {
  const deadlineMs = React.useMemo(() => new Date(deadlineAt).getTime(), [deadlineAt]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, deadlineMs - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const fractionLeft = Math.min(1, Math.max(0, remainingMs / (ttlSeconds * 1000)));

  // Fire onExpire exactly once when remaining TRANSITIONS from >0 to 0.
  // A mount-at-0 (e.g. user lands on the page after the deadline already
  // passed) must NOT fire — otherwise a parent that re-mounts us on a
  // reload-on-expire callback ends up in a tight loop (remount → fire →
  // reload → remount → …). Track the "was alive" bit so we only act on a
  // real transition.
  const wasAliveRef = React.useRef(remainingMs > 0);
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    if (remainingMs > 0) {
      wasAliveRef.current = true;
      return;
    }
    if (wasAliveRef.current && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [remainingMs, onExpire]);

  const tier: 'safe' | 'warn' | 'danger' =
    fractionLeft > 0.3 ? 'safe' : fractionLeft > 0.1 ? 'warn' : 'danger';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fractionLeft);

  const ringColor =
    tier === 'safe'
      ? 'stroke-chop-mboue'
      : tier === 'warn'
        ? 'stroke-amber-500'
        : 'stroke-chop-red';
  const labelColor =
    tier === 'safe' ? 'text-chop-ink' : tier === 'warn' ? 'text-amber-700' : 'text-chop-red';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-live="polite"
      aria-label={`${remainingSec} secondes restantes`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-chop-surface-gray"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(
            'transition-[stroke-dashoffset,stroke] duration-300 ease-linear',
            ringColor,
          )}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-extrabold tabular-nums leading-none',
            tier === 'danger' && remainingSec > 0 && 'animate-pulse',
            labelColor,
          )}
          style={{ fontSize: size * 0.32 }}
        >
          {remainingSec}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          secondes
        </span>
      </div>
    </div>
  );
}
