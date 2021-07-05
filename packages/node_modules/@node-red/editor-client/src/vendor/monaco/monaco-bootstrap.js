(function() {
    var _isIE = /MSIE \d|Trident.*rv:/.test(navigator.userAgent);
    //dont load monaco if IE
    if(_isIE === false) {
        var userLocale = (localStorage.getItem("editor-language") + "")
        var browserLocale = typeof navigator === "undefined" ? "" : (navigator.language ||  navigator.userLanguage || "");
        var cultureDists = {
            "zh-cn":"zh-hans",
            "zh-tw":"zh-hant",
            "ja":"ja",
            "ko":"ko",
            "de":"de",
            "fr":"fr",
            "it":"it",
            "es":"es",
            "ru":"ru",
            "tr":"tr",
            "pl":"pl",
            "pt-br":"pt-br",
            "cs":"cs"
        };
        var uiLanguage = cultureDists[userLocale.toLowerCase()] || cultureDists[browserLocale.toLowerCase()];
        if(uiLanguage) document.write('<script src="vendor/monaco/dist/locale/' + uiLanguage + '.js"><\/script>'); 
        document.write('<script src="vendor/monaco/dist/editor.js"><\/script>');
    }
})();