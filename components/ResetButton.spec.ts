import { describe, it, expect, vi } from 'vitest';
import './ResetButton';

async function mkButton(): Promise<HTMLElementTagNameMap['reset-button']> {
  const el = document.createElement('reset-button') as any;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('reset-button', () => {
  it('dispatches a "reset" event on click', async () => {
    const btn = await mkButton();
    const handler = vi.fn();
    btn.addEventListener('reset', handler);
    const shadow = (btn as any).shadowRoot as ShadowRoot;
    const button = shadow.querySelector('button')!;
    button.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
