/**
 * Copyright OpenJS Foundation and other contributors, https://openjsf.org
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

const should = require("should");
const sinon = require("sinon");
const cheerio = require("cheerio");
const NR_TEST_UTILS = require("nr-test-utils");
const clipboardModulePath = NR_TEST_UTILS.resolve("@node-red/editor-client/src/js/ui/clipboard.js");

describe("editor-client/ui/clipboard", function() {
    let $, buttons, notification, handlers, flow, importNodes, originalMethods;

    beforeEach(function() {
        const dom = cheerio.load('<div id="red-ui-editor"></div><div id="red-ui-workspace-chart"></div>');
        $ = function(selector, attributes) {
            const result = dom(selector);
            if (attributes) { result.attr(attributes); }
            return result;
        };
        $.prototype = dom.prototype;
        originalMethods = {};
        ["on", "trigger", "dialog", "i18n", "hide", "show", "focus", "height", "treeList", "attr"].forEach(function(method) {
            originalMethods[method] = $.prototype[method];
        });
        handlers = new WeakMap();
        // Supply the widget/event APIs around a real selector-capable DOM.
        $.prototype.on = function(event, handler) {
            this.each(function() {
                const events = handlers.get(this) || {};
                events[event] = handler;
                handlers.set(this, events);
            });
            return this;
        };
        $.prototype.trigger = function(event) {
            this.each(function() {
                const handler = (handlers.get(this) || {})[event];
                if (handler) {
                    handler.call(this, { stopPropagation() {} });
                }
            });
            return this;
        };
        $.prototype.dialog = function(options) {
            if (typeof options === "object") {
                buttons = options.buttons;
            }
            return this;
        };
        ["i18n", "hide", "show", "focus"].forEach(function(method) {
            $.prototype[method] = function() { return this; };
        });
        $.prototype.height = function() { return 800; };
        $.prototype.treeList = function(options) {
            const list = this;
            function append(items) {
                items.forEach(function(item) {
                    const row = $('<div>').appendTo(list);
                    row.append(item.gutter).append(item.element);
                    if (item.children) { append(item.children); }
                });
            }
            append(options.data);
            return this;
        };
        $.inArray = function(value, array) { return array.indexOf(value); };
        // Mirror checkbox properties used by browser event handlers.
        const originalAttr = $.prototype.attr;
        $.prototype.attr = function(name, value) {
            if ((name === "checked" || name === "disabled") && arguments.length > 1) {
                this.each(function() { this[name] = !!value; });
                if (!value) { return this.removeAttr(name); }
            }
            return originalAttr.apply(this, arguments);
        };
        flow = [
            { id: "subflow", type: "subflow", name: "SubTest", in: [{ wires: [{ id: "node" }] }], out: [] },
            { id: "node", type: "function", z: "subflow", wires: [["next"]] },
            { id: "next", type: "change", z: "subflow", wires: [[]] },
            { id: "tab", type: "tab", label: "test" }
        ];
        importNodes = sinon.stub();
        global.$ = $;
        global.window = {};
        global.RED = {
            _: function(key) { return key; },
            actions: { add: sinon.stub() }, events: { on: sinon.stub() },
            keyboard: { add: sinon.stub() },
            workspaces: { isLocked: function() { return false; } },
            view: { importNodes, focus: sinon.stub() },
            nodes: { getType: function() { return {}; } },
            utils: { createNodeIcon: function() { return $('<span>'); } },
            popover: { tooltip: sinon.stub() },
            notify: function(message, options) {
                notification = options;
                return { close: sinon.stub() };
            }
        };
        delete require.cache[clipboardModulePath];
        require(clipboardModulePath);
        RED.clipboard.init();
    });

    afterEach(function() {
        sinon.restore();
        Object.keys(originalMethods).forEach(function(method) {
            if (originalMethods[method]) {
                $.prototype[method] = originalMethods[method];
            } else {
                delete $.prototype[method];
            }
        });
        delete require.cache[clipboardModulePath];
        delete global.RED;
        delete global.$;
        delete global.window;
    });

    function openConflict() {
        const error = new Error("import_conflict");
        error.importConfig = {
            subflows: { subflow: flow[0] }, tabs: { tab: flow[3] },
            conflicted: { subflow: true }, zMap: { subflow: flow.slice(1, 3) },
            all: flow, configs: {}
        };
        importNodes.reset();
        importNodes.onFirstCall().throws(error);
        handlers.get($('#red-ui-drop-target')[0]).drop({
            originalEvent: { dataTransfer: { types: ["text/plain"], getData: function() { return JSON.stringify(flow); } } },
            preventDefault() {}
        });
        notification.buttons[1].click();
        // HTML parser elements do not automatically expose .checked.
        $('input[type="checkbox"]').each(function() { this.checked = $(this).attr("checked") !== undefined; });
    }

    function select(state) {
        $('.red-ui-clipboard-dialog-import-conflicts-gutter input[data-node-id="subflow"]').attr("checked", state).trigger("change");
    }

    function replace(state) {
        $('.red-ui-clipboard-dialog-import-conflicts-controls input[data-node-id="subflow"]').attr("checked", state);
    }

    function submit() {
        buttons.find(function(button) { return button.id === "red-ui-clipboard-dialog-import-conflict"; }).click.call($('#red-ui-clipboard-dialog')[0]);
        return importNodes.secondCall.args;
    }

    it("skips a deselected subflow after selecting replacement", function() {
        const original = JSON.stringify(flow);
        openConflict();
        select(true);
        replace(true);
        select(false);
        const result = submit();
        result[1].importMap.subflow.should.equal("skip");
        result[0].map(function(node) { return node.id; }).should.deepEqual(["tab"]);
        JSON.stringify(flow).should.equal(original);
    });

    it("replaces a selected subflow and its children", function() {
        openConflict();
        select(true);
        replace(true);
        const result = submit();
        result[1].importMap.subflow.should.equal("replace");
        result[1].importMap.node.should.equal("replace");
        result[0].should.deepEqual(flow);
    });

    it("copies a selected subflow without replacement", function() {
        openConflict();
        select(true);
        const result = submit();
        result[1].importMap.subflow.should.equal("copy");
        result[1].importMap.node.should.equal("copy");
    });

    it("retains replacement when the subflow is selected again", function() {
        openConflict();
        select(true);
        replace(true);
        select(false);
        select(true);
        submit()[1].importMap.subflow.should.equal("replace");
    });

    it("skips an initially deselected subflow on repeated imports", function() {
        for (let i = 0; i < 2; i++) {
            openConflict();
            const result = submit();
            result[1].importMap.subflow.should.equal("skip");
            result[0].map(function(node) { return node.id; }).should.deepEqual(["tab"]);
        }
    });
});
