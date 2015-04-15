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
 
var i18n = require("i18next");
var when = require("when");
var path = require("path");
var fs = require("fs");

var resourceMap = {
    "messages":  path.resolve(__dirname+"/../locales")
}


function registerMessageCatalog(namespace,dir) {
    return when.promise(function(resolve,reject) {
        resourceMap[namespace] = dir;
        i18n.loadNamespace(namespace,function() {
            resolve();
        });
    });
}

var MessageFileLoader = {
    fetchOne: function(lng, ns, callback) {
        if (resourceMap[ns]) {
            var file = path.join(resourceMap[ns],lng,"messages.json");
            fs.readFile(file,"utf8",function(err,content) {
                if (err) {
                    callback(err);
                } else {
                    try {
                        callback(null, JSON.parse(content.replace(/^\uFEFF/, '')));
                    } catch(e) {
                        callback(e);
                    }
                }
            });
        } else {
            callback(new Error("Unrecognised namespace"));
        }
    }
    
}

function init() {
    return when.promise(function(resolve,reject) {
        i18n.backend(MessageFileLoader);
        i18n.init({
            ns: {
                namespaces: ["messages"],
                defaultNs: "messages"
            },
            fallbackLng: ['en-US']
        },function() {
            resolve();
        });
    });
}


var obj = module.exports = {
    init: init,
    registerMessageCatalog: registerMessageCatalog
}

obj['_'] = function() {
    //var opts = {};
    //if (def) {
    //    opts.defaultValue = def;
    //}
    return i18n.t.apply(null,arguments);
}
