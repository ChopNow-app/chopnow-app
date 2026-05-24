import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Per DESIGN.md §4: all CTAs are pill-shaped (999px radius) — Uber-style
// thumb-friendly buttons. Active state scales 0.98 for tap feedback.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary/10',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'bg-muted text-foreground hover:bg-muted/80',
        link: 'text-primary underline-offset-4 hover:underline rounded-none',
      },
      size: {
        default: 'h-11 px-6 py-3',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        // Used on the rider app's outdoor CTAs (Picked-up, Delivered).
        jumbo: 'min-h-14 px-8 text-base font-bold',
        // 44px square — meets the WCAG 2.5.5 / Apple HIG touch-target floor
        // (was 40px which is below it). Affects close buttons, chips,
        // bottom-nav icons used standalone (icons inside a wider button
        // inherit the parent's `default`/`lg` height).
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
