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
    (menu as any)._showToast = vi.fn();
    return menu;
  }

  it('resets model to default and persists', () => {
    const menu = mkMenu();
    (menu as any)._npuModel = 'gemini-2.0-pro';
    (menu as any)._onResetNpuModel();
    expect((menu as any)._npuModel).toBe(NPU_DEFAULTS.model);
    expect(localStorage.getItem(NPU_STORAGE_KEYS.model)).toBe(NPU_DEFAULTS.model);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Advisor model reset', 1500);
  });

  it('resets temperature to default and persists', () => {
    const menu = mkMenu();
    (menu as any)._npuTemperature = 0.9;
    (menu as any)._onResetNpuTemp();
    expect((menu as any)._npuTemperature).toBeCloseTo(NPU_DEFAULTS.temperature, 6);
    expect(parseFloat(localStorage.getItem(NPU_STORAGE_KEYS.temperature)!)).toBeCloseTo(NPU_DEFAULTS.temperature, 6);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Temperature reset', 1500);
  });

  it('resets topP and topK to defaults and persists', () => {
    const menu = mkMenu();
    (menu as any)._npuTopP = 0.1;
    (menu as any)._npuTopK = 5;
    (menu as any)._onResetNpuTopP();
    (menu as any)._onResetNpuTopK();
    expect((menu as any)._npuTopP).toBeCloseTo(NPU_DEFAULTS.topP, 6);
    expect(parseFloat(localStorage.getItem(NPU_STORAGE_KEYS.topP)!)).toBeCloseTo(NPU_DEFAULTS.topP, 6);
    expect((menu as any)._npuTopK).toBe(NPU_DEFAULTS.topK);
    expect(parseInt(localStorage.getItem(NPU_STORAGE_KEYS.topK)!, 10)).toBe(NPU_DEFAULTS.topK);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Top P reset', 1500);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Top K reset', 1500);
  });

  it('resets thinking level and recent turns and persists', () => {
    const menu = mkMenu();
    (menu as any)._npuThinking = 'deep';
    (menu as any)._npuRecentTurns = NPU_LIMITS.recentTurns.max;
    (menu as any)._onResetNpuThinking();
    (menu as any)._onResetNpuRecentTurns();
    expect((menu as any)._npuThinking).toBe(NPU_DEFAULTS.thinkingLevel);
    expect(localStorage.getItem(NPU_STORAGE_KEYS.thinkingLevel)).toBe(NPU_DEFAULTS.thinkingLevel);
    expect((menu as any)._npuRecentTurns).toBe(NPU_DEFAULTS.recentTurns);
    expect(parseInt(localStorage.getItem(NPU_STORAGE_KEYS.recentTurns)!, 10)).toBe(NPU_DEFAULTS.recentTurns);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Thinking level reset', 1500);
    expect((menu as any)._showToast).toHaveBeenCalledWith('Recent turns reset', 1500);
  });

  it('range style helper fills to 100% at max', () => {
    const menu = mkMenu();
    const s = (menu as any)._rangeStyle(1, 0, 1) as string;
    expect(s).toContain('100%)');
  });
});
