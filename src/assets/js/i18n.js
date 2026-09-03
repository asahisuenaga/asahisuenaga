(() => {
    const SUPPORTED = ['en', 'ja'];
    const DEFAULT = 'en';

    const getLang = () => {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang');
        if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;

        const stored = localStorage.getItem('lang');
        if (stored && SUPPORTED.includes(stored)) return stored;

        const browser = navigator.language?.slice(0, 2);
        if (browser && SUPPORTED.includes(browser)) return browser;

        return DEFAULT;
    };

    let currentLang = getLang();
    let translations = {};

    const fetchTranslations = async () => {
        try {
            const responses = await Promise.all(
                SUPPORTED.map((lang) =>
                    fetch(`/locales/${lang}.json`).then((r) => r.json())
                )
            );
            SUPPORTED.forEach((lang, i) => {
                translations[lang] = responses[i];
            });
        } catch (e) {
            console.warn('Failed to load translations:', e);
        }
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[currentLang];
        for (const k of keys) {
            value = value?.[k];
        }
        return value ?? key;
    };

    const applyTranslations = () => {
        document.documentElement.lang = currentLang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.dataset.i18n;
            const value = t(key);
            if (typeof value === 'string') {
                el.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.dataset.i18nHtml;
            const value = t(key);
            if (typeof value === 'string') {
                el.innerHTML = value;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.dataset.i18nPlaceholder;
            const value = t(key);
            if (typeof value === 'string') {
                el.placeholder = value;
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.dataset.i18nTitle;
            const value = t(key);
            if (typeof value === 'string') {
                el.title = value;
            }
        });

        document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.dataset.i18nAria;
            const value = t(key);
            if (typeof value === 'string') {
                el.setAttribute('aria-label', value);
            }
        });

        document.title = t('site.title');
        document.querySelector('meta[name="description"]')?.setAttribute('content', t('site.description'));
    };

    const setLang = (lang) => {
        if (!SUPPORTED.includes(lang)) return;
        currentLang = lang;
        localStorage.setItem('lang', lang);
        applyTranslations();
    };

    const getAvailableLangs = () => SUPPORTED;

    const getCurrentLang = () => currentLang;

    window.i18n = {
        t,
        setLang,
        getLang: getCurrentLang,
        getAvailableLangs,
        applyTranslations,
        init: async () => {
            await fetchTranslations();
            applyTranslations();
        },
    };
})();