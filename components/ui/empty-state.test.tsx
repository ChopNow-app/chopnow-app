import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders icon + title + body when no CTA is provided', () => {
    render(<EmptyState icon="🍽️" title="Aucune commande" body="Tu n'as encore rien commandé." />);
    expect(screen.getByText('🍽️')).toBeInTheDocument();
    expect(screen.getByText('Aucune commande')).toBeInTheDocument();
    expect(screen.getByText("Tu n'as encore rien commandé.")).toBeInTheDocument();
    // No CTA = no link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the CTA as an anchor with the right href when provided', () => {
    render(
      <EmptyState
        icon="📍"
        title="Aucune adresse"
        body="Ajoute une adresse pour commander."
        cta={{ label: 'Ajouter une adresse', href: '/account/addresses/new' }}
      />,
    );
    const link = screen.getByRole('link', { name: /Ajouter une adresse/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/account/addresses/new');
  });

  it('renders the CTA as a button when onClick is provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon="📍"
        title="Aucune adresse"
        body="Ajoute-en une."
        cta={{ label: 'Ajouter', onClick }}
      />,
    );
    const btn = screen.getByRole('button', { name: /Ajouter/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
    // Button form should NOT also render as a link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('accepts a React node as the icon (not just an emoji)', () => {
    render(
      <EmptyState
        icon={<span data-testid="custom-icon">★</span>}
        title="Custom"
        body="With custom icon"
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
