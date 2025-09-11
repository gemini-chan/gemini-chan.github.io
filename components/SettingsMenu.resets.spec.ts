import { describe, it, expect, beforeEach, vi } from 'vitest';
import './SettingsMenu';
import { SettingsMenu } from '@components/SettingsMenu';
import { NPU_DEFAULTS, NPU_STORAGE_KEYS, NPU_LIMITS } from '@shared/constants';

describe('SettingsMenu advisor resets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function mkMenu(): SettingsMenu {
    const menu = new SettingsMenu();
    // Silence toasts and timers
    (menu as unknown as { [key: string]: unknown })._showToast = vi.fn();
    return menu;
  }

  it('resets model to default and persists', () => {
    const menu = mkMenu();
    (menu as unknown as { [key: string]: unknown })._npuModel = 'gemini-2.5-pro';
    (menu as unknown as { [key: string]: () => void })._onResetNpuModel();
    expect((menu as unknown as { [key: string]: unknown })._npuModel).toBe(NPU_DEFAULTS.model);
    expect(localStorage.getItem(NPU_STORAGE_KEYS.model)).toBe(NPU_DEFAULTS.model);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Advisor model reset', 1500);
  });

  it('resets temperature to default and persists', () => {
    const menu = mkMenu();
    (menu as unknown as { [key: string]: unknown })._npuTemperature = 0.9;
    (menu as unknown as { [key: string]: () => void })._onResetNpuTemp();
    expect((menu as unknown as { [key: string]: unknown })._npuTemperature).toBeCloseTo(NPU_DEFAULTS.temperature, 6);
    expect(parseFloat(localStorage.getItem(NPU_STORAGE_KEYS.temperature)!)).toBeCloseTo(NPU_DEFAULTS.temperature, 6);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Temperature reset', 1500);
  });

  it('resets topP and topK to defaults and persists', () => {
    const menu = mkMenu();
    (menu as unknown as { [key: string]: unknown })._npuTopP = 0.1;
    (menu as unknown as { [key: string]: unknown })._npuTopK = 5;
    (menu as unknown as { [key: string]: () => void })._onResetNpuTopP();
    (menu as unknown as { [key: string]: () => void })._onResetNpuTopK();
    expect((menu as unknown as { [key: string]: unknown })._npuTopP).toBeCloseTo(NPU_DEFAULTS.topP, 6);
    expect(parseFloat(localStorage.getItem(NPU_STORAGE_KEYS.topP)!)).toBeCloseTo(NPU_DEFAULTS.topP, 6);
    expect((menu as unknown as { [key: string]: unknown })._npuTopK).toBe(NPU_DEFAULTS.topK);
    expect(parseInt(localStorage.getItem(NPU_STORAGE_KEYS.topK)!, 10)).toBe(NPU_DEFAULTS.topK);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Top P reset', 1500);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Top K reset', 1500);
  });

  it('resets thinking level and recent turns and persists', () => {
    const menu = mkMenu();
    (menu as unknown as { [key: string]: unknown })._npuThinking = 'deep';
    (menu as unknown as { [key: string]: unknown })._npuRecentTurns = NPU_LIMITS.recentTurns.max;
    (menu as unknown as { [key: string]: () => void })._onResetNpuThinking();
    (menu as unknown as { [key: string]: () => void })._onResetNpuRecentTurns();
    expect((menu as unknown as { [key: string]: unknown })._npuThinking).toBe(NPU_DEFAULTS.thinkingLevel);
    expect(localStorage.getItem(NPU_STORAGE_KEYS.thinkingLevel)).toBe(NPU_DEFAULTS.thinkingLevel);
    expect((menu as unknown as { [key: string]: unknown })._npuRecentTurns).toBe(NPU_DEFAULTS.recentTurns);
    expect(parseInt(localStorage.getItem(NPU_STORAGE_KEYS.recentTurns)!, 10)).toBe(NPU_DEFAULTS.recentTurns);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Thinking level reset', 1500);
    expect((menu as unknown as { [key: string]: unknown })._showToast).toHaveBeenCalledWith('Recent turns reset', 1500);
  });

  it('range style helper fills to 100% at max', () => {
    const menu = mkMenu();
    const s = (menu as unknown as { [key: string]: (a: number, b: number, c: number) => string })._rangeStyle(1, 0, 1) as string;
    expect(s).toContain('100%)');
  });
});
