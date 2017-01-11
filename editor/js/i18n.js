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
                resGetPath: 'locales/__ns__',
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
            i18n.loadNamespace(namespace,done);
        }
    }
})();
