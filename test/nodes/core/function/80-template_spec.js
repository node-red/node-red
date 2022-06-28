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
var templateNode = require("nr-test-utils").require("@node-red/nodes/core/function/80-template.js");
var Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");
var helper = require("node-red-node-test-helper");

describe('template node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    beforeEach(function(done) {
        done();
    });

    function initContext(done) {
        Context.init({
            contextStorage: {
		memory0: { // do not use (for excluding effect fallback)
		    module: "memory"
		},
                memory1: {
                    module: "memory"
                },
                memory2: {
                    module: "memory"
                }
            }
        });
        Context.load().then(function () {
            done();
        });
    }

    afterEach(function() {
        helper.unload().then(function () {
            return Context.clean({allNodes:{}});
        }).then(function () {
            return Context.close();
        });
    });


    it('should modify payload using node-configured template', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo');
                    msg.should.have.property('template', 'this should be ignored as the node has its own template {{payload}}');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"foo",topic: "bar", template: "this should be ignored as the node has its own template {{payload}}"});
        });
    });

    it('should modify the configured property using msg.template', function(done) {
        var flow = [{id:"n1", type:"template", field:"randomProperty", template:"",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                msg.should.have.property('template', 'payload={{payload}}');
                msg.should.have.property('randomProperty', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo", topic: "bar", template: "payload={{payload}}"});
        });
    });

    it('should be able to overwrite msg.template using the template from msg.template', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", template:"",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'topic=bar');
                msg.should.have.property('template', 'topic={{topic}}');
                done();
            });
            n1.receive({payload:"foo", topic: "bar", template: "topic={{topic}}"});
        });
    });

    it('should modify payload from msg.template', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", template:"",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var received = [];
            n2.on("input", function(msg) {
                try {
                    received.push(msg);
                    if (received.length === 3) {
                        received[0].should.have.property('topic', 'bar');
                        received[0].should.have.property('payload', 'topic=bar');
                        received[0].should.have.property('template', 'topic={{topic}}');

                        received[1].should.have.property('topic', 'another bar');
                        received[1].should.have.property('payload', 'topic=another bar');
                        received[1].should.have.property('template', 'topic={{topic}}');

                        received[2].should.have.property('topic', 'bar');
                        received[2].should.have.property('payload', 'payload=foo');
                        received[2].should.have.property('template', 'payload={{payload}}');
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"foo", topic: "bar", template: "topic={{topic}}"});
            n1.receive({payload:"foo", topic: "another bar", template: "topic={{topic}}"});
            n1.receive({payload:"foo", topic: "bar", template: "payload={{payload}}"});
        });
    });

    describe('env var', function() {
        before(function() {
            process.env.TEST = 'xyzzy';
        })
        after(function() {
            delete process.env.TEST;
        })

        it('should modify payload from env variable', function(done) {
            var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{env.TEST}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
            helper.load(templateNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', 'payload=xyzzy');
                    done();
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should modify payload from flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{flow.value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().flow.set("value","foo");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify payload from persistable flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{flow[memory1].value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo');
                    done();
                });
                n1.context().flow.set("value","foo","memory1",function (err) {
                    n1.receive({payload:"foo",topic: "bar"});
                });
            });
        });
    });

    it('should handle nested context tags - property not set', function(done) {
        // This comes from the Coursera Node-RED course and is a good example of
        // multiple conditional tags
        var template = `{{#flow.time}}time={{flow.time}}{{/flow.time}}{{^flow.time}}!time{{/flow.time}}{{#flow.random}}random={{flow.random}}randomtime={{flow.randomtime}}{{/flow.random}}{{^flow.random}}!random{{/flow.random}}`;
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:template,wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', '!time!random');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    })
    it('should handle nested context tags - property set', function(done) {
        // This comes from the Coursera Node-RED course and is a good example of
        // multiple conditional tags
        var template = `{{#flow.time}}time={{flow.time}}{{/flow.time}}{{^flow.time}}!time{{/flow.time}}{{#flow.random}}random={{flow.random}}randomtime={{flow.randomtime}}{{/flow.random}}{{^flow.random}}!random{{/flow.random}}`;
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:template,wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', 'bar');
                        msg.should.have.property('payload', 'time=123random=456randomtime=789');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.context().flow.set(["time","random","randomtime"],["123","456","789"],function (err) {
                    n1.receive({payload:"foo",topic: "bar"});
                });
            });
        });
    })

    it('should modify payload from two persistable flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{flow[memory1].value}}/{{flow[memory2].value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo/bar');
                    done();
                });
                n1.context().flow.set("value","foo","memory1",function (err) {
                    n1.context().flow.set("value","bar","memory2",function (err) {
                        n1.receive({payload:"foo",topic: "bar"});
                    });
                });
            });
        });
    });

    it('should modify payload from global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{global.value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.context().global.set("value","foo");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify payload from persistable global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{global[memory1].value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo');
                    done();
                });
                n1.context().global.set("value","foo","memory1", function (err) {
                    n1.receive({payload:"foo",topic: "bar"});
                });
            });
        });
    });

    it('should modify payload from two persistable global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{global[memory1].value}}/{{global[memory2].value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo/bar');
                    done();
                });
                n1.context().global.set("value","foo","memory1", function (err) {
                    n1.context().global.set("value","bar","memory2", function (err) {
                        n1.receive({payload:"foo",topic: "bar"});
                    });
                });
            });
        });
    });

    it('should modify payload from persistable flow & global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", template:"payload={{flow[memory1].value}}/{{global[memory1].value}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'payload=foo/bar');
                    done();
                });
                n1.context().flow.set("value","foo","memory1", function (err) {
                    n1.context().global.set("value","bar","memory1", function (err) {
                        n1.receive({payload:"foo",topic: "bar"});
                    });
                });
            });
        });
    });

    it('should handle missing node context', function(done) {
        // this is artificial test because in flow there is missing z property (probably never happen in real usage)
        var flow = [{id:"n1",type:"template", field:"payload", template:"payload={{flow.value}},{{global.value}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=,');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle escape characters in Mustache format and JSON output mode', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", syntax:"mustache", template:"{\"data\":\"{{payload}}\"}", output:"json", wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.payload.should.have.property('data', 'line\t1\nline\\2\r\nline\b3\f');
                done();
            });
            n1.receive({payload:"line\t1\nline\\2\r\nline\b3\f"});
        });
    });

    it('should modify payload in plain text mode', function(done) {
        var flow = [{id:"n1", type:"template", field:"payload", syntax:"plain", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload={{payload}}');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", fieldType:"flow", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                // mesage is intact
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                // result is in flow context
                n2.context().flow.get("payload").should.equal("payload=foo");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify persistable flow context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"#:(memory1)::payload", fieldType:"flow", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    // mesage is intact
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'foo');
                    // result is in flow context
                    n2.context().flow.get("payload", "memory1", function (err, val) {
                        val.should.equal("payload=foo");
                        done();
                    });
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should modify global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"payload", fieldType:"global", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                // mesage is intact
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                // result is in global context
                n2.context().global.get("payload").should.equal("payload=foo");
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should modify persistable global context', function(done) {
        var flow = [{id:"n1",z:"t1", type:"template", field:"#:(memory1)::payload", fieldType:"global", template:"payload={{payload}}",wires:[["n2"]]},{id:"n2",z:"t1",type:"helper"}];
        helper.load(templateNode, flow, function() {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    // mesage is intact
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload', 'foo');
                    // result is in global context
                    n2.context().global.get("payload", "memory1", function (err, val) {
                        val.should.equal("payload=foo");
                        done();
                    });
                });
                n1.receive({payload:"foo",topic: "bar"});
            });
        });
    });

    it('should handle if the field isn\'t set', function(done) {
        var flow = [{id:"n1", type:"template", template: "payload={{payload}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'payload=foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle deeper objects', function(done) {
        var flow = [{id:"n1", type:"template", field: "topic.foo.bar", template: "payload={{payload.doh.rei.me}}",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic');
                msg.topic.should.have.property('foo');
                msg.topic.foo.should.have.a.property('bar', 'payload=foo');
                done();
            });
            n1.receive({payload:{doh:{rei:{me:"foo"}}}});
        });
    });

    it('should handle block contexts objects', function(done) {
        var flow = [{id:"n1", type:"template", template: "A{{#payload.A}}{{payload.A}}{{.}}{{/payload.A}}B",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('payload','AabcabcB');
                done();
            });
            n1.receive({payload:{A:"abc"}});
        });
    });

    it('should raise error if passed bad template', function(done) {
        var flow = [{id:"n1", type:"template", field: "payload", template: "payload={{payload",wires:[["n2"]]},{id:"n2",type:"helper"}];
        helper.load(templateNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                var logEvents = helper.log().args.filter(function(evt) {
                    return evt[0].type == "template";
                });
                logEvents.should.have.length(1);
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.toString().should.startWith("Unclosed tag at ");
                done();
            },25);
            n1.receive({payload:"foo"});
        });
    });

});
