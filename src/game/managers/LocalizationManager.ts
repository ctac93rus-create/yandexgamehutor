import en from '../data/localization/en.json';
import ru from '../data/localization/ru.json';
import { settingsManager, type Locale } from './SettingsManager';

type Dictionary = Record<string, string | Dictionary>;

const dictionaries: Record<Locale, Dictionary> = {
  ru,
  en,
};

export class LocalizationManager {
  private locale: Locale = 'ru';

  public init(): void {
    const settings = settingsManager.load();
    this.locale = settings.locale;
  }

  public setLocale(locale: Locale): void {
    this.locale = locale;
    settingsManager.setLocale(locale);
  }

  public getLocale(): Locale {
    return this.locale;
  }

  public t(key: string, params?: Record<string, string | number>): string {
    const value = this.resolve(dictionaries[this.locale], key) ?? this.resolve(dictionaries.ru, key) ?? key;
    if (!params) {
      return value;
    }

    return Object.entries(params).reduce((acc, [token, tokenValue]) => {
      return acc.replaceAll(`{{${token}}}`, String(tokenValue));
    }, value);
  }

  private resolve(dict: Dictionary, key: string): string | null {
    const parts = key.split('.');
    let cursor: string | Dictionary = dict;

    for (let i = 0; i < parts.length; i += 1) {
      if (typeof cursor !== 'object' || cursor === null || !(parts[i] in cursor)) {
        return null;
      }
      cursor = cursor[parts[i]] as string | Dictionary;
    }

    return typeof cursor === 'string' ? cursor : null;
  }
}

export const localizationManager = new LocalizationManager();
