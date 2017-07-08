/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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

RED.i18n = (function() {

    return {
        init: function(done) {
            i18n.init({
                resGetPath: 'locales/__ns__?lng=__lng__',
                dynamicLoad: false,
                load:'current',
                ns: {
                    namespaces: ["editor","node-red","jsonata","infotips"],
                    defaultNs: "editor"
                },
                fallbackLng: ['en-US'],
                useCookie: false
            },function() {
                done();
            });
            RED["_"] = function() {
                return i18n.t.apply(null,arguments);
            }

        },
        loadCatalog: function(namespace,done) {
            var languageList = i18n.functions.toLanguages(i18n.detectLanguage());
            var toLoad = languageList.length;
            languageList.forEach(function(lang) {
                $.ajax({
                    headers: {
                        "Accept":"application/json"
                    },
                    cache: false,
                    url: 'locales/'+namespace+'?lng='+lang,
                    success: function(data) {
                        i18n.addResourceBundle(lang,namespace,data);
                        toLoad--;
                        if (toLoad === 0) {
                            done();
                        }
                    }
                });
            })

        },

        loadNodeCatalogs: function(done) {
            var languageList = i18n.functions.toLanguages(i18n.detectLanguage());
            var toLoad = languageList.length;

            languageList.forEach(function(lang) {
                $.ajax({
                    headers: {
                        "Accept":"application/json"
                    },
                    cache: false,
                    url: 'locales/nodes?lng='+lang,
                    success: function(data) {
                        var namespaces = Object.keys(data);
                        namespaces.forEach(function(ns) {
                            i18n.addResourceBundle(lang,ns,data[ns]);
                        });
                        toLoad--;
                        if (toLoad === 0) {
                            done();
                        }
                    }
                });
            })
        }
    }
})();
