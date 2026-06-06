import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput, isValidCameroonPhone, isValidE164 } from './PhoneInput';

describe('PhoneInput', () => {
  it('renders the dial-code dropdown with Cameroon as default', () => {
    render(<PhoneInput />);
    const select = screen.getByLabelText('Indicatif pays') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('CM');
  });

  it('emits E.164 with selected dial code when user types digits', async () => {
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
    await user.type(screen.getByPlaceholderText('6XX XXX XXX'), '670123456');
    // Last emit should be the full E.164 — dial 237 + the digits typed.
    expect(onChange).toHaveBeenLastCalledWith('+237670123456');
  });

  it('strips non-digits from the local-number input', async () => {
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
    // 67012... etc with non-digits stripped, prefixed by +237.
    expect(onChange).toHaveBeenLastCalledWith('+237670123456');
  });

  it('switches the dial code when the dropdown changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = React.useState('+237670000000');
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
    // User picks France (+33). Existing digits are kept and re-emitted
    // under the new dial code. The dropdown is keyed by ISO code.
    await user.selectOptions(screen.getByLabelText('Indicatif pays'), 'FR');
    expect(onChange).toHaveBeenLastCalledWith('+33670000000');
  });

  it('keeps the chosen dial code when changed before any digits are typed', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [v, setV] = React.useState('');
      return <PhoneInput value={v} onChange={setV} />;
    }
    render(<Wrapper />);
    const select = screen.getByLabelText('Indicatif pays') as HTMLSelectElement;
    // Pick France first, with the number field still empty — the selection
    // must stick instead of snapping back to Cameroun.
    await user.selectOptions(select, 'FR');
    expect(select.value).toBe('FR');
    // Now typing digits emits E.164 under the remembered dial code.
    await user.type(screen.getByPlaceholderText(/6 12 34/), '695412820');
    expect((screen.getByLabelText('Indicatif pays') as HTMLSelectElement).value).toBe('FR');
  });

  it('distinguishes countries that share a dial code (US vs Canada)', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [v, setV] = React.useState('');
      return <PhoneInput value={v} onChange={setV} />;
    }
    render(<Wrapper />);
    const select = screen.getByLabelText('Indicatif pays') as HTMLSelectElement;
    // Both US and CA dial +1; selecting Canada must keep Canada selected
    // rather than snapping to the first +1 entry (US).
    await user.selectOptions(select, 'CA');
    expect(select.value).toBe('CA');
    await user.selectOptions(select, 'US');
    expect(select.value).toBe('US');
  });

  it('keeps an explicit Canada pick selected after digits are typed', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [v, setV] = React.useState('');
      return <PhoneInput value={v} onChange={setV} />;
    }
    render(<Wrapper />);
    const select = screen.getByLabelText('Indicatif pays') as HTMLSelectElement;
    // Pick Canada, then type a number. The emitted value is '+1…', which is
    // ambiguous between US and CA — but the explicit pick must win, so the
    // dropdown stays on Canada rather than snapping to US (the first +1 entry).
    await user.selectOptions(select, 'CA');
    await user.type(screen.getByPlaceholderText('(XXX) XXX-XXXX'), '4165551234');
    expect((screen.getByLabelText('Indicatif pays') as HTMLSelectElement).value).toBe('CA');
  });

  it('parses an E.164 value back to dial code + local digits', () => {
    render(<PhoneInput value="+33695412820" />);
    const select = screen.getByLabelText('Indicatif pays') as HTMLSelectElement;
    expect(select.value).toBe('FR');
    expect((screen.getByPlaceholderText(/6 12 34/) as HTMLInputElement).value).toBe('695412820');
  });

  it('renders error text when provided', () => {
    render(<PhoneInput error="invalid" />);
    expect(screen.getByText('invalid')).toBeInTheDocument();
  });
});

describe('isValidE164', () => {
  it.each([
    ['+237670000000', true],
    ['+33695412820', true],
    ['+14155552671', true],
    ['670000000', false], // missing leading '+'
    ['+0123456789', false], // starts with 0
    ['+1', false], // too short
    ['+1234567890123456', false], // 16 digits — too long
    ['', false],
  ])('returns %s for %s', (input, expected) => {
    expect(isValidE164(input)).toBe(expected);
  });
});

describe('isValidCameroonPhone (backwards-compat)', () => {
  it.each([
    ['670000000', true], // legacy bare 9-digit
    ['650000000', true],
    ['690999999', true],
    ['+237670000000', true], // E.164 Cameroon
    ['+33695412820', false], // E.164 but not Cameroon
    ['630000000', false], // doesn't start with 65-69
    ['67000000', false], // 8 digits
    ['', false],
  ])('returns %s for %s', (input, expected) => {
    expect(isValidCameroonPhone(input)).toBe(expected);
  });
});
