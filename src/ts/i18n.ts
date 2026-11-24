import en from '../locales/en.json';
import ja from '../locales/ja.json';
type SupportedLang = 'en' | 'ja';

interface TranslationDict {
    [key: string]: string | TranslationDict | TranslationDict[];
}

interface I18nAPI {
    t: (key: string) => string;
    setLang: (lang: string) => void;
    getLang: () => SupportedLang;
    getAvailableLangs: () => readonly SupportedLang[];
    applyTranslations: () => void;
    init: () => Promise<void>;
}

declare global {
    interface Window {
        i18n: I18nAPI;
    }
}

(() => {
    const SUP: readonly SupportedLang[] = ['en', 'ja'] as const;
    const tr: Record<SupportedLang, TranslationDict> = { en, ja };

    const isSupportedLang = (lang: string | null | undefined): lang is SupportedLang => {
        return typeof lang === 'string' && (SUP as readonly string[]).includes(lang);
    };

    const candidates: (string | null | undefined)[] = [
        new URLSearchParams(location.search).get('lang'),
        localStorage.getItem('lang'),
        navigator.language?.slice(0, 2),
    ];

    let lang: SupportedLang = candidates.find(isSupportedLang) ?? 'en';

    const t = (key: string): string => {
        const result = key.split('.').reduce<string | TranslationDict | TranslationDict[] | undefined>((o, k) => {
            if (o && typeof o === 'object') {
                return Array.isArray(o) ? o[Number(k)] : o[k];
            }
            return undefined;
        }, tr[lang]);

        return typeof result === 'string' ? result : key;
    };

    type TranslationBinding = readonly [
        selector: string,
        datasetKey: string,
        applyFn: (el: HTMLElement, value: string) => void
    ];

    const applyTranslations = (): void => {
        document.documentElement.lang = lang;

        const bindings: readonly TranslationBinding[] = [
            ['[data-i18n]', 'i18n', (el, v) => { el.textContent = v; }],
            ['[data-i18n-html]', 'i18nHtml', (el, v) => { el.innerHTML = v; }],
            [
                '[data-i18n-placeholder]',
                'i18nPlaceholder',
                (el, v) => {
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        el.placeholder = v;
                    }
                },
            ],
            ['[data-i18n-title]', 'i18nTitle', (el, v) => { el.title = v; }],
            ['[data-i18n-aria]', 'i18nAria', (el, v) => { el.setAttribute('aria-label', v); }],
        ];

        bindings.forEach(([sel, key, fn]) => {
            document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
                const translationKey = el.dataset[key];
                if (translationKey) {
                    const v = t(translationKey);
                    fn(el, v);
                }
            });
        });

        document.title = t('site.title');

        const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        metaDescription?.setAttribute('content', t('site.description'));

        document.documentElement.classList.add('i18n-ready');
    };

    const setLang = (l: string): void => {
        if (isSupportedLang(l)) {
            lang = l;
            localStorage.setItem('lang', l);
            applyTranslations();
        }
    };

    window.i18n = {
        t,
        setLang,
        getLang: (): SupportedLang => lang,
        getAvailableLangs: (): readonly SupportedLang[] => SUP,
        applyTranslations,
        init: async (): Promise<void> => {
            applyTranslations();
        },
    };
})();