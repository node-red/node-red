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

var express = require("express");
var util = require("util");
var path = require("path");
var fs = require("fs");
var clone = require("clone");

var defaultContext = {
    page: {
        title: "Node-RED",
        favicon: "favicon.ico",
        tabicon: "red/images/node-red-icon-black.svg"
    },
    header: {
        title: "Node-RED",
        image: "red/images/node-red.png"
    },
    asset: {
        red: (process.env.NODE_ENV == "development")? "red/red.js":"red/red.min.js",
        main: (process.env.NODE_ENV == "development")? "red/main.js":"red/main.min.js",

    }
};

var theme = null;
var themeContext = clone(defaultContext);
var themeSettings = null;
var runtime = null;

var themeApp;

function serveFile(app,baseUrl,file) {
    try {
        var stats = fs.statSync(file);
        var url = baseUrl+path.basename(file);
        //console.log(url,"->",file);
        app.get(url,function(req, res) {
            res.sendFile(file);
        });
        return "theme"+url;
    } catch(err) {
        //TODO: log filenotfound
        return null;
    }
}

function serveFilesFromTheme(themeValue, themeApp, directory) {
    var result = [];
    if (themeValue) {
        var array = themeValue;
        if (!util.isArray(array)) {
            array = [array];
        }

        for (var i=0;i<array.length;i++) {
            var url = serveFile(themeApp,directory,array[i]);
            if (url) {
                result.push(url);
            }
        }
    }
    return result
}

module.exports = {
    init: function(runtime) {
        var settings = runtime.settings;
        themeContext = clone(defaultContext);
        if (runtime.version) {
            themeContext.version = runtime.version();
        }
        themeSettings = null;
        theme = settings.editorTheme || {};
    },

    app: function() {
        var i;
        var url;
        themeSettings = {};

        themeApp = express();

        if (theme.page) {

            themeContext.page.css = serveFilesFromTheme(
                theme.page.css,
                themeApp,
                "/css/")
            themeContext.page.scripts = serveFilesFromTheme(
                theme.page.scripts,
                themeApp,
                "/scripts/")

            if (theme.page.favicon) {
                url = serveFile(themeApp,"/favicon/",theme.page.favicon)
                if (url) {
                    themeContext.page.favicon = url;
                }
            }

            if (theme.page.tabicon) {
                url = serveFile(themeApp,"/tabicon/",theme.page.tabicon)
                if (url) {
                    themeContext.page.tabicon = url;
                }
            }

            themeContext.page.title = theme.page.title || themeContext.page.title;
        }

        if (theme.header) {

            themeContext.header.title = theme.header.title || themeContext.header.title;

            if (theme.header.hasOwnProperty("url")) {
                themeContext.header.url = theme.header.url;
            }

            if (theme.header.hasOwnProperty("image")) {
                if (theme.header.image) {
                    url = serveFile(themeApp,"/header/",theme.header.image);
                    if (url) {
                        themeContext.header.image = url;
                    }
                } else {
                    themeContext.header.image = null;
                }
            }
        }

        if (theme.deployButton) {
            if (theme.deployButton.type == "simple") {
                themeSettings.deployButton = {
                    type: "simple"
                }
                if (theme.deployButton.label) {
                    themeSettings.deployButton.label = theme.deployButton.label;
                }
                if (theme.deployButton.icon) {
                    url = serveFile(themeApp,"/deploy/",theme.deployButton.icon);
                    if (url) {
                        themeSettings.deployButton.icon = url;
                    }
                }
            }
        }

        if (theme.hasOwnProperty("userMenu")) {
            themeSettings.userMenu = theme.userMenu;
        }

        if (theme.login) {
            if (theme.login.image) {
                url = serveFile(themeApp,"/login/",theme.login.image);
                if (url) {
                    themeContext.login = {
                        image: url
                    }
                }
            }
        }

        if (theme.hasOwnProperty("menu")) {
            themeSettings.menu = theme.menu;
        }

        if (theme.hasOwnProperty("palette")) {
            themeSettings.palette = theme.palette;
        }

        if (theme.hasOwnProperty("projects")) {
            themeSettings.projects = theme.projects;
        }


        return themeApp;
    },
    context: function() {
        return themeContext;
    },
    settings: function() {
        return themeSettings;
    },
    serveFile: function(baseUrl,file) {
        return serveFile(themeApp,baseUrl,file);
    }
}
