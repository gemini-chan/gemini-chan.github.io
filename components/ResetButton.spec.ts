import { describe, it, expect, vi } from 'vitest';
import './ResetButton';
import type { ResetButton } from './ResetButton';

async function mkButton(): Promise<ResetButton> {
  const el = document.createElement('reset-button') as ResetButton;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('reset-button', () => {
  it('dispatches a "reset" event on click', async () => {
    const btn = await mkButton();
    const handler = vi.fn();
    btn.addEventListener('reset', handler);
    const shadow = (btn as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    const button = shadow.querySelector('button')!;
    button.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
