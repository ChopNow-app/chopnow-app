import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput, isValidCameroonPhone } from './PhoneInput';

describe('PhoneInput', () => {
  it('shows the +237 prefix', () => {
    render(<PhoneInput />);
    expect(screen.getByText('+237')).toBeInTheDocument();
  });

  it('strips non-digits on input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = React.useState('');
      return (
        <PhoneInput
          value={v}
          onChange={(next) => {
            setV(next);
            onChange(next);
          }}
        />
      );
    }
    render(<Wrapper />);
    await user.type(screen.getByPlaceholderText('6XX XXX XXX'), '67a0b1c2d3-456');
    expect(onChange).toHaveBeenLastCalledWith('670123456');
  });

  it('renders error text when provided', () => {
    render(<PhoneInput error="invalid" />);
    expect(screen.getByText('invalid')).toBeInTheDocument();
  });
});

describe('isValidCameroonPhone', () => {
  it.each([
    ['670000000', true],
    ['650000000', true],
    ['690999999', true],
    ['630000000', false], // doesn't start with 65-69
    ['67000000', false], // 8 digits
    ['', false],
  ])('returns %s for %s', (input, expected) => {
    expect(isValidCameroonPhone(input)).toBe(expected);
  });
});
