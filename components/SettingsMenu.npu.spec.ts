import { describe, it, expect, beforeEach } from 'vitest';
import './SettingsMenu';
import { SettingsMenu } from '@components/SettingsMenu';
import { NPU_STORAGE_KEYS, NPU_DEFAULTS } from '@shared/constants';

describe('SettingsMenu NPU temperature initialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to default when temperature is invalid', () => {
    localStorage.setItem(NPU_STORAGE_KEYS.temperature, 'abc');
    const menu = new SettingsMenu();
    const temp = (menu as any)._npuTemperature as number;
    expect(temp).toBeCloseTo(NPU_DEFAULTS.temperature, 6);
  });

  it('clamps temperature into [0, 1]', () => {
    localStorage.setItem(NPU_STORAGE_KEYS.temperature, '1.5');
    const menu = new SettingsMenu();
    const tempHigh = (menu as any)._npuTemperature as number;
    expect(tempHigh).toBeCloseTo(1.0, 6);

    localStorage.setItem(NPU_STORAGE_KEYS.temperature, '-0.2');
    const menu2 = new SettingsMenu();
    const tempLow = (menu2 as any)._npuTemperature as number;
    expect(tempLow).toBeCloseTo(0.0, 6);
  });
});
