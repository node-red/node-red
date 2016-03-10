/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var fs = require('fs');
var path = require('path');
var i18n;
var supportedLangs = [];

var apiLocalDir = path.resolve(path.join(__dirname,"locales"));

var initSupportedLangs = function() {
    fs.readdir(apiLocalDir, function(err,files) {
        if(!err) {
            supportedLangs = files;
        }
    });
}

function determineLangFromHeaders(acceptedLanguages){
    var lang = i18n.defaultLang;
    acceptedLanguages = acceptedLanguages || [];
    for (var i=0;i<acceptedLanguages.length;i++){
        if (supportedLangs.indexOf(acceptedLanguages[i]) !== -1){
            lang = acceptedLanguages[i];
            break;
        // check the language without the country code
        } else if (supportedLangs.indexOf(acceptedLanguages[i].split("-")[0]) !== -1) {
            lang = acceptedLanguages[i].split("-")[0];
            break;
        }
    }
    return lang;
}

module.exports = {
    init: function(runtime) {
        i18n = runtime.i18n;
        initSupportedLangs();
    },
    get: function(req,res) {
        var namespace = req.params[0];
        namespace = namespace.replace(/\.json$/,"");
        var lang = determineLangFromHeaders(req.acceptsLanguages() || []);
        var prevLang = i18n.i.lng();
        i18n.i.setLng(lang, function(){
            var catalog = i18n.catalog(namespace,lang);
            res.json(catalog||{});
        });
        i18n.i.setLng(prevLang);
    },
    determineLangFromHeaders: determineLangFromHeaders
}
