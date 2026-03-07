(function () {
    // Supported/built-in Monaco locales as of v0.55.1
    // NOTES:
    //  - 'en' is built-in (not a lang pack) so will not actually be loaded.
    //  - 'es-es' is a listed language in the NR Language dropdown, however in the case where a user has set their
    //    locale to 'es-mx' (or other spanish variant) we will default to 'es' in the getCultureDist helper function.
    //  - 'it', 'pl' and 'tr' are not listed in the NR Language dropdown, however they are supported by monaco, so we allow
    //    that lang pack to be loaded when the user has set their browser locale to one of those languages.
    const langPacks = {
        'en': 'BUILT-IN',
        'cs': 'cs.js',
        'de': 'de.js',
        'es-es': 'es.js',
        'es': 'es.js', // fallback for other spanish variants such as es-mx. See notes above.
        'fr': 'fr.js',
        'it': 'it.js',
        'ja': 'ja.js',
        'ko': 'ko.js',
        'pl': 'pl.js',
        'pt-br': 'pt-br.js',
        'ru': 'ru.js',
        'tr': 'tr.js',
        'zh-cn': 'zh-cn.js',
        'zh-tw': 'zh-tw.js',
    }
    // Determine the UI language - first try full BCP 47 user setting, then its base language, then browser prefered language(s).
    const userLocale = (localStorage.getItem('editor-language') || '').toLowerCase()
    let langPack = langPacks[userLocale] || langPacks[userLocale.split('-')[0]] // try full locale, then base language
    if (!langPack && window.navigator) {
        const languages = navigator.languages || [navigator.language]
        for (let i = 0; i < languages.length; i++) {
            const lang = (languages[i] || '').toLowerCase()
            langPack = langPacks[lang] || langPacks[lang.split('-')[0]] // try full locale, then base language
            if (langPack) { break }
        }
    }

    const bootstrapEl = document.getElementById('monaco-bootstrap') || document.currentScript

    // If we have a suitable language pack, add a script tag to load it (note 'en' is built-in)
    if (langPack && langPack !== 'BUILT-IN') {
        const langScriptEl = document.createElement('script')
        langScriptEl.src = 'vendor/monaco/dist/locale/' + langPack
        langScriptEl.async = false
        bootstrapEl.parentElement.appendChild(langScriptEl)
    }

    // now add vendor/monaco/dist/editor.js
    const editorScriptEl = document.createElement('script')
    editorScriptEl.src = 'vendor/monaco/dist/editor.js'
    bootstrapEl.parentElement.appendChild(editorScriptEl)
})();
