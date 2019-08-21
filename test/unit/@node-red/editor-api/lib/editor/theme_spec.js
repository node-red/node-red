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

var should = require("should");
var express = require('express');
var sinon = require('sinon');
var when = require('when');
var fs = require("fs");

var app = express();

var NR_TEST_UTILS = require("nr-test-utils");

var theme = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/theme");

describe("api/editor/theme", function () {
    beforeEach(function () {
        sinon.stub(fs, "statSync", function () { return true; });
    });
    afterEach(function () {
        theme.init({settings: {}});
        fs.statSync.restore();
    });
    it("applies the default theme", function () {
        var result = theme.init({});
        should.not.exist(result);

        var context = theme.context();
        context.should.have.a.property("page");
        context.page.should.have.a.property("title", "Node-RED");
        context.page.should.have.a.property("favicon", "favicon.ico");
        context.page.should.have.a.property("tabicon", "red/images/node-red-icon-black.svg");
        context.should.have.a.property("header");
        context.header.should.have.a.property("title", "Node-RED");
        context.header.should.have.a.property("image", "red/images/node-red.svg");
        context.should.have.a.property("asset");
        context.asset.should.have.a.property("red", "red/red.min.js");
        context.asset.should.have.a.property("main", "red/main.min.js");

        should.not.exist(theme.settings());
    });

    it("picks up custom theme", function () {
        theme.init({
            editorTheme: {
                page: {
                    title: "Test Page Title",
                    favicon: "/absolute/path/to/theme/favicon",
                    tabicon: "/absolute/path/to/theme/tabicon",
                    css: "/absolute/path/to/custom/css/file.css",
                    scripts: "/absolute/path/to/script.js"
                },
                header: {
                    title: "Test Header Title",
                    url: "http://nodered.org",
                    image: "/absolute/path/to/header/image" // or null to remove image
                },

                deployButton: {
                    type: "simple",
                    label: "Save",
                    icon: "/absolute/path/to/deploy/button/image" // or null to remove image
                },

                menu: { // Hide unwanted menu items by id. see editor/js/main.js:loadEditor for complete list
                    "menu-item-import-library": false,
                    "menu-item-export-library": false,
                    "menu-item-keyboard-shortcuts": false,
                    "menu-item-help": {
                        label: "Alternative Help Link Text",
                        url: "http://example.com"
                    }
                },

                userMenu: false, // Hide the user-menu even if adminAuth is enabled

                login: {
                    image: "/absolute/path/to/login/page/big/image" // a 256x256 image
                },

                palette: {
                    editable: true,
                    catalogues: ['https://catalogue.nodered.org/catalogue.json'],
                    theme: [{ category: ".*", type: ".*", color: "#f0f" }]
                },

                projects: {
                    enabled: false
                }
            }
        });

        theme.app();

        var context = theme.context();
        context.should.have.a.property("page");
        context.page.should.have.a.property("title", "Test Page Title");
        context.page.should.have.a.property("favicon", "theme/favicon/favicon");
        context.page.should.have.a.property("tabicon", "theme/tabicon/tabicon");
        context.should.have.a.property("header");
        context.header.should.have.a.property("title", "Test Header Title");
        context.header.should.have.a.property("url", "http://nodered.org");
        context.header.should.have.a.property("image", "theme/header/image");
        context.page.should.have.a.property("css");
        context.page.css.should.have.lengthOf(1);
        context.page.css[0].should.eql('theme/css/file.css');
        context.page.should.have.a.property("scripts");
        context.page.scripts.should.have.lengthOf(1);
        context.page.scripts[0].should.eql('theme/scripts/script.js');
        context.should.have.a.property("login");
        context.login.should.have.a.property("image", "theme/login/image");

        var settings = theme.settings();
        settings.should.have.a.property("deployButton");
        settings.deployButton.should.have.a.property("type", "simple");
        settings.deployButton.should.have.a.property("label", "Save");
        settings.deployButton.should.have.a.property("icon", "theme/deploy/image");
        settings.should.have.a.property("userMenu");
        settings.userMenu.should.be.eql(false);
        settings.should.have.a.property("menu");
        settings.menu.should.have.a.property("menu-item-import-library", false);
        settings.menu.should.have.a.property("menu-item-export-library", false);
        settings.menu.should.have.a.property("menu-item-keyboard-shortcuts", false);
        settings.menu.should.have.a.property("menu-item-help", { label: "Alternative Help Link Text", url: "http://example.com" });
        settings.should.have.a.property("palette");
        settings.palette.should.have.a.property("editable", true);
        settings.palette.should.have.a.property("catalogues", ['https://catalogue.nodered.org/catalogue.json']);
        settings.palette.should.have.a.property("theme", [{ category: ".*", type: ".*", color: "#f0f" }]);
        settings.should.have.a.property("projects");
        settings.projects.should.have.a.property("enabled", false);
    });

});
