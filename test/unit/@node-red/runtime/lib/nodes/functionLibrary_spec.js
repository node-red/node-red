var should = require("should");
var sinon = require('sinon');

var NR_TEST_UTILS = require("nr-test-utils");
var functionLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/nodes/functionLibrary");
var flows = NR_TEST_UTILS.require("@node-red/runtime/lib/flows");

describe("runtime/nodes/functionLibrary", function() {

    function makeNode(overrides) {
        var node = Object.assign({
            id: "node1",
            type: "function",
            mode: "library",
            name: "",
            z: "flow1",
            _flow: {
                TYPE: "flow",
                flow: { id: "flow1", label: "Flow 1" }
            }
        }, overrides || {});
        return node;
    }

    var flowsGetStub;
    beforeEach(function() {
        // by default, treat every registered node as still "live"
        flowsGetStub = sinon.stub(flows, "get").callsFake(function(id) {
            return functionLibrary.getEntryById(id) && functionLibrary.getEntryById(id).node;
        });
    });
    afterEach(function() {
        flowsGetStub.restore();
        functionLibrary.clear();
    });

    describe("#register", function() {
        it("throws if the node is not a Function node in library mode", function() {
            (function() { functionLibrary.register(null); }).should.throw();
            (function() { functionLibrary.register(makeNode({type:"function", mode:"default"})); }).should.throw();
            (function() { functionLibrary.register(makeNode({type:"change", mode:"library"})); }).should.throw();
        });
        it("indexes the node by id and by name", function() {
            var node = makeNode({id:"n1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.getEntryById("n1").should.have.property("id","n1");
            functionLibrary.getEntry("mathlib").should.have.property("id","n1");
        });
        it("does not throw when the node has no name", function() {
            var node = makeNode({id:"n1", name:""});
            should(function() { functionLibrary.register(node); }).not.throw();
            should.not.exist(functionLibrary.getEntry(""));
        });
    });

    describe("#setExports / #setError", function() {
        it("records exports and flips state to ready", function() {
            var node = makeNode({id:"n1", name:"mathlib"});
            functionLibrary.register(node);
            var count = functionLibrary.setExports(node, {add: function(){}});
            count.should.equal(1);
            functionLibrary.getEntryById("n1").state.should.equal("ready");
        });
        it("is a no-op if the node has since been removed", function() {
            var node = makeNode({id:"n1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.remove(node);
            should(function() { functionLibrary.setExports(node, {add:function(){}}); }).not.throw();
            should.not.exist(functionLibrary.getEntryById("n1"));
        });
        it("records an error and flips state to error", function() {
            var node = makeNode({id:"n1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.setError(node, new Error("boom"));
            functionLibrary.getEntryById("n1").state.should.equal("error");
        });
    });

    describe("#remove", function() {
        it("removes the id and name index entries", function() {
            var node = makeNode({id:"n1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.remove(node);
            should.not.exist(functionLibrary.getEntryById("n1"));
            should.not.exist(functionLibrary.getEntry("mathlib"));
        });
        it("is a no-op for a node that was never registered", function() {
            should(function() { functionLibrary.remove(makeNode({id:"never"})); }).not.throw();
        });
    });

    function ready(node, exportsObject) {
        functionLibrary.register(node);
        functionLibrary.setExports(node, exportsObject || {fn: function(){return 42;}});
        return node;
    }

    describe("#resolve", function() {
        it("throws for an invalid target", function() {
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, ""); }).should.throw();
            (function() { functionLibrary.resolve(caller, null); }).should.throw();
        });

        it("resolves by direct node id", function() {
            var lib = ready(makeNode({id:"lib1", name:"mathlib"}));
            var caller = makeNode({id:"caller"});
            var exp = functionLibrary.resolve(caller, "lib1");
            exp.fn().should.equal(42);
        });

        it("resolves by name, scoped to the caller's flow first", function() {
            ready(makeNode({id:"lib1", name:"mathlib", _flow:{TYPE:"flow", flow:{id:"flowA"}}}));
            var caller = makeNode({id:"caller", _flow:{TYPE:"flow", flow:{id:"flowA"}}});
            var exp = functionLibrary.resolve(caller, "mathlib");
            exp.fn().should.equal(42);
        });

        it("resolves by name flow-wide when unique", function() {
            ready(makeNode({id:"lib1", name:"mathlib", _flow:{TYPE:"flow", flow:{id:"flowA"}}}));
            var caller = makeNode({id:"caller", _flow:{TYPE:"flow", flow:{id:"flowB"}}});
            var exp = functionLibrary.resolve(caller, "mathlib");
            exp.fn().should.equal(42);
        });

        it("throws when a name is ambiguous across flows", function() {
            ready(makeNode({id:"lib1", name:"mathlib", _flow:{TYPE:"flow", flow:{id:"flowA"}}}));
            ready(makeNode({id:"lib2", name:"mathlib", _flow:{TYPE:"flow", flow:{id:"flowB"}}}));
            var caller = makeNode({id:"caller", _flow:{TYPE:"flow", flow:{id:"flowC"}}});
            (function() { functionLibrary.resolve(caller, "mathlib"); }).should.throw();
        });

        it("throws when the target is not found", function() {
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, "nope"); }).should.throw();
        });

        it("resolves a subflow-local design-time id via the caller's z", function() {
            // simulates a node inside a subflow instance "inst1", whose sibling
            // library node's design-time id is "designLib" -> runtime id "inst1-designLib"
            ready(makeNode({
                id:"inst1-designLib", name:"", z:"inst1",
                _flow:{TYPE:"subflow", flow:{id:"inst1"}, subflowDef:{name:"My Subflow"}}
            }));
            var caller = makeNode({
                id:"inst1-designCaller", z:"inst1",
                _flow:{TYPE:"subflow", flow:{id:"inst1"}, subflowDef:{name:"My Subflow"}}
            });
            var exp = functionLibrary.resolve(caller, "designLib");
            exp.fn().should.equal(42);
        });

        it("throws not-ready while the target is still initialising", function() {
            var node = makeNode({id:"lib1", name:"mathlib"});
            functionLibrary.register(node);
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, "lib1"); }).should.throw();
        });

        it("throws init-failed if the target's setup errored", function() {
            var node = makeNode({id:"lib1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.setError(node, new Error("boom"));
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, "lib1"); }).should.throw();
        });

        it("throws no-exports if the target exported nothing", function() {
            var node = makeNode({id:"lib1", name:"mathlib"});
            functionLibrary.register(node);
            functionLibrary.setExports(node, {});
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, "lib1"); }).should.throw();
        });

        it("self-heals and throws not-available for a stale entry", function() {
            var node = ready(makeNode({id:"lib1", name:"mathlib"}));
            // simulate the node having been stopped/replaced without `remove()` firing
            flowsGetStub.callsFake(function(id) { return id === "lib1" ? undefined : node; });
            var caller = makeNode({id:"caller"});
            (function() { functionLibrary.resolve(caller, "lib1"); }).should.throw();
            should.not.exist(functionLibrary.getEntryById("lib1"));
        });
    });

    describe("#list / #clear", function() {
        it("lists registered entries without exposing internal node references", function() {
            ready(makeNode({id:"lib1", name:"mathlib"}));
            var list = functionLibrary.list();
            list.should.have.length(1);
            list[0].should.have.property("id","lib1");
            list[0].should.have.property("name","mathlib");
            list[0].should.have.property("exportNames").which.is.an.Array();
            list[0].should.not.have.property("node");
        });
        it("clear empties the registry", function() {
            ready(makeNode({id:"lib1", name:"mathlib"}));
            functionLibrary.clear();
            functionLibrary.list().should.have.length(0);
        });
    });

});
