(() => {
    const SUP = ['en', 'ja'], tr = {};
    let lang = [new URLSearchParams(location.search).get('lang'), localStorage.getItem('lang'), navigator.language?.slice(0, 2)].find(l => SUP.includes(l)) || 'en';

    const fetchTranslations = () => Promise.all(SUP.map(l => fetch(`/locales/${l}.json`).then(r => r.json()).then(d => tr[l] = d))).catch(e => console.warn('Failed to load translations:', e));

    const t = key => key.split('.').reduce((o, k) => o?.[k], tr[lang]) ?? key;

    const applyTranslations = () => {
        document.documentElement.lang = lang;
        [
            ['[data-i18n]', 'i18n', (el, v) => el.textContent = v],
            ['[data-i18n-html]', 'i18nHtml', (el, v) => el.innerHTML = v],
            ['[data-i18n-placeholder]', 'i18nPlaceholder', (el, v) => el.placeholder = v],
            ['[data-i18n-title]', 'i18nTitle', (el, v) => el.title = v],
            ['[data-i18n-aria]', 'i18nAria', (el, v) => el.setAttribute('aria-label', v)]
        ].forEach(([sel, key, fn]) => {
            document.querySelectorAll(sel).forEach(el => {
                const v = t(el.dataset[key]);
                if (typeof v === 'string') fn(el, v);
            });
        });
        document.title = t('site.title');
        document.querySelector('meta[name="description"]')?.setAttribute('content', t('site.description'));
        document.documentElement.classList.add('i18n-ready');
    };

    const setLang = l => {
        if (SUP.includes(l)) {
            lang = l;
            localStorage.setItem('lang', l);
            applyTranslations();
        }
    };

    window.i18n = {
        t, setLang, getLang: () => lang, getAvailableLangs: () => SUP, applyTranslations,
        init: async () => { await fetchTranslations(); applyTranslations(); }
    };
})();