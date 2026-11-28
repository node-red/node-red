/**
 * Copyright OpenJS Foundation and other contributors, https://openjsf.org/
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

const assert = require("assert");
const modulePath = require("nr-test-utils").resolve("@node-red/editor-client/src/js/ui/projects/tab-versionControl.js");

describe("editor-client/ui/projects/versionControl refresh", function() {
    let requests, activeProject, versionControl, previousRED, previousJQuery;

    beforeEach(function() {
        requests = [];
        activeProject = { name: "first", git: {} };
        previousRED = global.RED;
        previousJQuery = global.$;
        // Widgets are not under test: keep the real module and control only its
        // UI/network dependencies so status requests can finish in a chosen order.
        function widget() {
            const element = {};
            ["appendTo", "append", "css", "on", "attr", "prop", "text", "hide",
                "show", "parent", "addClass", "removeClass", "remove", "val", "i18n"]
                .forEach(method => { element[method] = () => element; });
            element.editableList = action => action === "length" ? 0 : element;
            return element;
        }
        global.$ = widget;
        $.getJSON = (url, success) => {
            const request = { url, success };
            requests.push(request);
            return {
                fail(callback) { request.fail = callback; return this; },
                always(callback) { request.always = callback; return this; }
            };
        };
        global.RED = {
            _: value => value,
            actions: { add() {} }, events: { on() {} },
            user: { hasPermission: () => true },
            popover: { tooltip() {} },
            projects: { getActiveProject: () => activeProject },
            sidebar: { addTab() {} },
            stack: { create: () => ({ add: () => ({ header: widget(), content: widget(), expand() {} }) }) }
        };
        delete require.cache[modulePath];
        require(modulePath);
        versionControl = RED.sidebar.versionControl;
        versionControl.init({
            createBranchList: widget,
            addSpinnerOverlay: widget,
            sendRequest() {}
        });
    });

    afterEach(function() {
        global.RED = previousRED;
        global.$ = previousJQuery;
        delete require.cache[modulePath];
    });

    function finish(request, failed) {
        if (failed) {
            if (request.fail) { request.fail(); }
        } else {
            request.success({ files: {}, branches: { local: "main" }, commits: {} });
        }
        if (request.always) { request.always(); }
    }

    it("refreshes the current project after an earlier status request completes", function() {
        versionControl.refresh();
        activeProject = { name: "second", git: {} };
        versionControl.refresh(true);
        assert.equal(requests.length, 1);
        finish(requests[0]);
        assert.deepEqual(requests.map(r => r.url), ["projects/first/status", "projects/second/status"]);
    });

    it("coalesces pending refreshes without losing a requested remote fetch", function() {
        versionControl.refresh();
        versionControl.refresh(true, true);
        versionControl.refresh();
        finish(requests[0]);
        assert.equal(requests.length, 2);
        assert.equal(requests[1].url, "projects/first/status?remote=true");
        finish(requests[1]);
        assert.equal(requests.length, 2);
    });

    it("runs a pending refresh after a failed request", function() {
        versionControl.refresh();
        versionControl.refresh(true);
        finish(requests[0], true);
        assert.equal(requests.length, 2);
    });

    it("does not schedule another request when nothing changed", function() {
        versionControl.refresh();
        finish(requests[0]);
        assert.equal(requests.length, 1);
    });

    it("can refresh after starting with no active project", function() {
        activeProject = null;
        versionControl.refresh();
        activeProject = { name: "first", git: {} };
        versionControl.refresh(true);
        assert.equal(requests.length, 1);
    });
});
