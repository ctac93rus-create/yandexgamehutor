export type Locale = 'ru' | 'en';

interface SettingsState {
  locale: Locale;
  tutorialCompleted: boolean;
  sfxEnabled: boolean;
}

const SETTINGS_KEY = 'ygh_settings_v1';

const DEFAULT_STATE: SettingsState = {
  locale: 'ru',
  tutorialCompleted: false,
  sfxEnabled: true,
};

export class SettingsManager {
  private state: SettingsState = { ...DEFAULT_STATE };

  public load(): SettingsState {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      this.state = { ...DEFAULT_STATE };
      return this.getState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      this.state = {
        locale: parsed.locale === 'en' ? 'en' : 'ru',
        tutorialCompleted: parsed.tutorialCompleted === true,
        sfxEnabled: parsed.sfxEnabled !== false,
      };
    } catch {
      this.state = { ...DEFAULT_STATE };
    }

    return this.getState();
  }

  public getState(): SettingsState {
    return { ...this.state };
  }

  public setLocale(locale: Locale): void {
    this.state.locale = locale;
    this.persist();
  }

  public setTutorialCompleted(value: boolean): void {
    this.state.tutorialCompleted = value;
    this.persist();
  }

  public setSfxEnabled(value: boolean): void {
    this.state.sfxEnabled = value;
    this.persist();
  }

  public resetTutorial(): void {
    this.state.tutorialCompleted = false;
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.state));
  }
}

export const settingsManager = new SettingsManager();
