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

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const acorn = require("acorn");
const walk = require("acorn-walk");
const sinon = require("sinon");
const NR_TEST_UTILS = require("nr-test-utils");

const viewPath = NR_TEST_UTILS.resolve("@node-red/editor-client/src/js/ui/view.js");
const source = fs.readFileSync(viewPath, "utf8");
// Execute the production declarations, not a copy of the geometry algorithm.
// Only the surrounding DOM, model and animation boundaries are replaced.
const names = ["updateActiveNodes", "calculateMinZoom", "zoomToFitAll"];
const declarations = {};
walk.simple(acorn.parse(source, { ecmaVersion: "latest" }), {
    FunctionDeclaration(node) {
        if (names.includes(node.id.name)) {
            declarations[node.id.name] = source.slice(node.start, node.end);
        }
    }
});
names.forEach(name => assert.ok(declarations[name], `Missing view function ${name}`));

describe("editor-client/ui/view zoom to fit", function() {
    let context;
    let nodes;
    let junctions;
    let workspace;

    function junction(x, y, z = "active") {
        return { type: "junction", x, y, z };
    }

    beforeEach(function() {
        nodes = [];
        junctions = [];
        workspace = "active";
        const groupSelection = {
            data: function() { return this; },
            sort: function() { return this; }
        };
        context = {
            activeNodes: [], activeLinks: [], activeJunctions: [], activeGroups: [],
            space_width: 8000, space_height: 8000, scaleFactor: 1,
            buttonZoomTimeout: null, buttonZoomWorkspaceCenter: null,
            clearTimeout,
            chart: {
                width: () => 800, height: () => 600,
                scrollLeft: sinon.stub().returns(0), scrollTop: sinon.stub().returns(0)
            },
            $: () => ({ width: () => 0 }),
            groupLayer: { selectAll: () => groupSelection },
            animatedZoomView: sinon.spy(),
            RED: {
                workspaces: { active: () => workspace },
                nodes: {
                    filterNodes: ({ z }) => nodes.filter(n => n.z === z),
                    filterLinks: () => [],
                    junctions: z => junctions.filter(n => n.z === z),
                    groups: () => []
                },
                events: { emit: sinon.spy() },
                view: { zoomAnimator: { easeToValuesRAF: sinon.spy() } }
            }
        };
        vm.createContext(context);
        vm.runInContext(fs.readFileSync(NR_TEST_UTILS.resolve(
            "@node-red/editor-client/src/js/ui/view-zoom-constants.js"
        ), "utf8"), context);
        vm.runInContext(names.map(name => declarations[name]).join("\n"), context);
    });

    function expectZoom(zoom, x, y) {
        context.zoomToFitAll();
        sinon.assert.calledOnce(context.animatedZoomView);
        const args = context.animatedZoomView.firstCall.args;
        assert.ok(Math.abs(args[0] - zoom) < 1e-9);
        assert.deepStrictEqual(Array.from(args[1]), [400, 300]);
        assert.deepStrictEqual(Array.from(args[2]), [x, y]);
    }

    it("fits a cross made entirely of junctions without width/height fields", function() {
        junctions = [[4000, 3000], [3700, 3000], [4300, 3000], [4000, 2800], [4000, 3200]]
            .map(([x, y]) => junction(x, y));
        expectZoom(800 / 770, 4000, 3000);
    });

    it("fits a single junction and respects maximum zoom", function() {
        junctions = [junction(2000, 2000)];
        expectZoom(2, 2000, 2000);
    });

    it("includes distant junctions in a mixed flow", function() {
        nodes = [{ x: 1000, y: 1000, w: 100, h: 30, z: "active" }];
        junctions = [junction(3000, 1800)];
        expectZoom(800 / 2215, 1977.5, 1395);
    });

    it("preserves ordinary node bounds and ignores other workspaces", function() {
        nodes = [
            { x: 1000, y: 1000, w: 100, h: 30, z: "active" },
            { x: 1800, y: 1400, w: 100, h: 30, z: "active" }
        ];
        junctions = [junction(7000, 7000, "other")];
        expectZoom(800 / 1060, 1400, 1200);
    });

    it("pans junctions into view when the fitted zoom is unchanged", function() {
        junctions = [junction(2000, 2000), junction(2630, 2000)];
        context.zoomToFitAll();
        sinon.assert.notCalled(context.animatedZoomView);
        const pan = context.RED.view.zoomAnimator.easeToValuesRAF;
        sinon.assert.calledOnce(pan);
        assert.strictEqual(pan.firstCall.args[0].toValues.scrollLeft, 1915);
        assert.strictEqual(pan.firstCall.args[0].toValues.scrollTop, 1700);
    });

    it("does nothing for an empty workspace", function() {
        context.zoomToFitAll();
        sinon.assert.notCalled(context.animatedZoomView);
        sinon.assert.notCalled(context.RED.view.zoomAnimator.easeToValuesRAF);
    });

    it("does nothing when no workspace is active", function() {
        workspace = 0;
        junctions = [junction(2000, 2000)];
        context.zoomToFitAll();
        sinon.assert.notCalled(context.animatedZoomView);
        sinon.assert.notCalled(context.RED.view.zoomAnimator.easeToValuesRAF);
    });
});
