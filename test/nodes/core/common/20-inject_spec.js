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
var injectNode = require("nr-test-utils").require("@node-red/nodes/core/common/20-inject.js");
var Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");
var helper = require("node-red-node-test-helper");

describe('inject node', function() {

    beforeEach(function(done) {
        helper.startServer(() => {
            done()
        });
    });

    function initContext(done) {
        Context.init({
            contextStorage: {
                memory0: {
                    module: "memory"
                },
                memory1: {
                    module: "memory"
                }
            }
        });
        Context.load().then(function () {
            done();
        });
    }

    afterEach(async function() {
        helper.unload().then(function () {
            return Context.clean({allNodes: {}});
        }).then(function () {
            return Context.close();
        }).then(function () {
            helper.stopServer(done);
        });
    });

    function basicTest(type, val, rval) {
        it('inject value ('+type+')', function (done) {
            var flow = [
                {id:'flow', type:'tab'},
                {id: "n1", type: "inject", topic: "t1", payload: val, payloadType: type, wires: [["n2"]], z: "flow"},
                {id: "n2", type: "helper", z:'flow'}
            ];
            helper.load(injectNode, flow, function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", "t1");
                        if (rval) {
                            msg.should.have.property("payload");
                            should.deepEqual(msg.payload, rval);
                        }
                        else {
                            msg.should.have.property("payload", val);
                        }
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                n1.receive({});
            });
        });
    }

    basicTest("num", 10);
    basicTest("str", "10");
    basicTest("bool", true);
    var val_json = '{ "x":"vx", "y":"vy", "z":"vz" }';
    basicTest("json", val_json, JSON.parse(val_json));
    var val_buf = "[1,2,3,4,5]";
    basicTest("bin", val_buf, Buffer.from(JSON.parse(val_buf)));

    it('inject value of environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", topic: "t1", payload: "NR_TEST", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                delete process.env.NR_TEST
                try {
                    msg.should.have.property("topic", "t1");
                    msg.should.have.property("payload", "foo");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            process.env.NR_TEST = 'foo';
            n1.receive({});
        });
    });

    it('inject name of node as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_NODE_NAME", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "NAME");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of node as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_NODE_ID", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "n1");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject path of node as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_NODE_PATH", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "flow/n1");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });


    it('inject name of flow as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_FLOW_NAME", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"},
                    {id: "flow", type: "tab", label: "FLOW" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "FLOW");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of flow as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_FLOW_ID", payloadType: "env", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"},
                    {id: "flow", type: "tab", name: "FLOW" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "flow");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject name of group as environment variable ', function (done) {
        var flow = [{id: "flow", type: "tab" },
                    {id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_GROUP_NAME", payloadType: "env", wires: [["n2"]], z: "flow", g: "g0"},
                    {id: "n2", type: "helper", z: "flow"},
                    {id: "g0", type: "group", name: "GROUP", z: "flow" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "GROUP");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of group as environment variable ', function (done) {
        var flow = [{id: "flow", type: "tab" },
                    {id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "NR_GROUP_ID", payloadType: "env", wires: [["n2"]], z: "flow", g: "g0"},
                    {id: "n2", type: "helper", z: "flow"},
                    {id: "g0", type: "group", name: "GROUP", z: "flow" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "g0");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });


    it('inject name of node as environment variable by substitution ', function (done) {
        var flow = [{id: "flow", type: "tab" },
                    {id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_NODE_NAME}", payloadType: "str", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper", z: "flow"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "NAME");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of node as environment variable by substitution ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_NODE_ID}", payloadType: "str", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "n1");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject path of node as environment variable by substitution ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_NODE_PATH}", payloadType: "str", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "flow/n1");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });


    it('inject name of flow as environment variable by substitution ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_FLOW_NAME}", payloadType: "str", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"},
                    {id: "flow", type: "tab", label: "FLOW" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "FLOW");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of flow as environment variable ', function (done) {
        var flow = [{id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_FLOW_ID}", payloadType: "str", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"},
                    {id: "flow", type: "tab", name: "FLOW" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "flow");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject name of group as environment variable by substitution ', function (done) {
        var flow = [{id: "flow", type: "tab" },
                    {id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_GROUP_NAME}", payloadType: "str", wires: [["n2"]], z: "flow", g: "g0"},
                    {id: "n2", type: "helper", z: "flow"},
                    {id: "g0", type: "group", name: "GROUP", z: "flow" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "GROUP");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    it('inject id of group as environment variable by substitution ', function (done) {
        var flow = [{id: "flow", type: "tab" },
                    {id: "n1", type: "inject", name: "NAME", topic: "t1", payload: "${NR_GROUP_ID}", payloadType: "str", wires: [["n2"]], z: "flow", g: "g0"},
                    {id: "n2", type: "helper", z: "flow"},
                    {id: "g0", type: "group", name: "GROUP", z: "flow" },
                   ];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "g0");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });


    it('sets the value of flow context property', function (done) {
        var flow = [{id: "n1", type: "inject", topic: "t1", payload: "flowValue", payloadType: "flow", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("topic", "t1");
                    msg.should.have.property("payload", "changeMe");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.context().flow.set("flowValue", "changeMe");
            n1.receive({});
        });
    });

    it('sets the value of persistable flow context property', function (done) {
        var flow = [{id: "n1", type: "inject", topic: "t1", payload: "#:(memory0)::flowValue", payloadType: "flow", wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", "t1");
                        msg.should.have.property("payload", "changeMe");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                n1.context().flow.set("flowValue", "changeMe", "memory0", function (err) {
                    n1.receive({});
                });
            });
        });
    });


    it('sets the value of two persistable flow context property', function (done) {
        var flow = [{id: "n0", z: "flow", type: "inject", topic: "t0", payload: "#:(memory0)::val", payloadType: "flow", wires: [["n2"]]},
                    {id: "n1", z: "flow", type: "inject", topic: "t1", payload: "#:(memory1)::val", payloadType: "flow", wires: [["n2"]]},
                    {id: "n2", z: "flow", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n0 = helper.getNode("n0");
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic");
                        if (msg.topic === "t0") {
                            msg.should.have.property("payload", "foo");
                        }
                        else if (msg.topic === "t1") {
                            msg.should.have.property("payload", "bar");
                        }
                        else {
                            done(new Error("unexpected message"));
                        }
                        count++;
                        if (count === 2) {
                            done();
                        }
                    } catch (err) {
                        done(err);
                    }
                });
                var global = n0.context().flow;
                global.set("val", "foo", "memory0", function (err) {
                    global.set("val", "bar", "memory1", function (err) {
                        n0.receive({});
                        n1.receive({});
                    });
                });
            });
        });
    });

    it('sets the value of global context property', function (done) {
        var flow = [{id: "n1", type: "inject", topic: "t1", payload: "globalValue", payloadType: "global", wires: [["n2"]]},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("topic", "t1");
                    msg.should.have.property("payload", "changeMe");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.context().global.set("globalValue", "changeMe");
            n1.receive({});
        });
    });

    it('sets the value of persistable global context property', function (done) {
        var flow = [{id: "n1", z: "flow", type: "inject", topic: "t1", payload: "#:(memory1)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n2", z: "flow", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", "t1");
                        msg.should.have.property("payload", "foo");
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
                var global = n1.context().global;
                global.set("val", "foo", "memory1", function (err) {
                    n1.receive({});
                });
            });
        });
    });

    it('sets the value of two persistable global context property', function (done) {
        var flow = [{id: "n0", z: "flow", type: "inject", topic: "t0", payload: "#:(memory0)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n1", z: "flow", type: "inject", topic: "t1", payload: "#:(memory1)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n2", z: "flow", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n0 = helper.getNode("n0");
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic");
                        if (msg.topic === "t0") {
                            msg.should.have.property("payload", "foo");
                        }
                        else if (msg.topic === "t1") {
                            msg.should.have.property("payload", "bar");
                        }
                        else {
                            done(new Error("unexpected message"));
                        }
                        count++;
                        if (count === 2) {
                            done();
                        }
                    } catch (err) {
                        done(err);
                    }
                });
                var global = n0.context().global;
                global.set("val", "foo", "memory0", function (err) {
                    global.set("val", "bar", "memory1", function (err) {
                        n0.receive({});
                        n1.receive({});
                    });
                });
            });
        });
    });

    it('sets the value of persistable flow & global context property', function (done) {
        var flow = [{id: "n0", z: "flow", type: "inject", topic: "t0", payload: "#:(memory0)::val", payloadType: "flow", wires: [["n2"]]},
                    {id: "n1", z: "flow", type: "inject", topic: "t1", payload: "#:(memory1)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n2", z: "flow", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n0 = helper.getNode("n0");
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic");
                        if (msg.topic === "t0") {
                            msg.should.have.property("payload", "foo");
                        }
                        else if (msg.topic === "t1") {
                            msg.should.have.property("payload", "bar");
                        }
                        else {
                            done(new Error("unexpected message"));
                        }
                        count++;
                        if (count === 2) {
                            done();
                        }
                    } catch (err) {
                        done(err);
                    }
                });
                var context = n0.context();
                var flow = context.flow;
                var global = context.global;
                flow.set("val", "foo", "memory0", function (err) {
                    global.set("val", "bar", "memory1", function (err) {
                        n0.receive({});
                        n1.receive({});
                    });
                });
            });
        });
    });

    it('sets the value of two persistable global context property', function (done) {
        var flow = [{id: "n0", z: "flow", type: "inject", topic: "t0", payload: "#:(memory0)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n1", z: "flow", type: "inject", topic: "t1", payload: "#:(memory1)::val", payloadType: "global", wires: [["n2"]]},
                    {id: "n2", z: "flow", type: "helper"}];
        helper.load(injectNode, flow, function () {
            initContext(function () {
                var n0 = helper.getNode("n0");
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic");
                        if (msg.topic === "t0") {
                            msg.should.have.property("payload", "foo");
                        }
                        else if (msg.topic === "t1") {
                            msg.should.have.property("payload", "bar");
                        }
                        else {
                            done(new Error("unexpected message"));
                        }
                        count++;
                        if (count === 2) {
                            done();
                        }
                    } catch (err) {
                        done(err);
                    }
                });
                var global = n0.context().global;
                global.set("val", "foo", "memory0", function (err) {
                    global.set("val", "bar", "memory1", function (err) {
                        n0.receive({});
                        n1.receive({});
                    });
                });
            });
        });
    });
    it('should inject once with default delay property', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n1 = helper.getNode("n1");
                    n1.should.have.property('onceDelay', 100);
                    done();
                  });
    });

    it('should inject once with default delay', function(done) {
        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, wires:[["n2"]] },
                   {id:"n2", type:"helper"}],
                  function() {
                      var n2 = helper.getNode("n2");
                      n2.on("input", function(msg) {
                          try {
                              msg.should.have.property('topic', 't1');
                              msg.should.have.property('payload');
                              should(msg.payload).be.lessThan(timestamp.getTime());
                              done();
                          } catch(err) {
                              done(err);
                          }
                      });
                  });
    });

    it('should inject once with 500 msec. delay', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, onceDelay: 0.5, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n1 = helper.getNode("n1");
                    n1.should.have.property('onceDelay', 500);
                    done();
                  });
    });

  it('should inject once with delay of two seconds', function(done) {
        this.timeout(2700); // have to wait for the inject with delay of two seconds

        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, onceDelay: 2, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                      msg.should.have.property('topic', 't1');
                      should(msg.payload).be.greaterThan(timestamp.getTime());
                      done();
                    });
                  });
    });

    it('should inject repeatedly', function(done) {

        helper.load(injectNode, [{id:"n1", type:"inject",
                    payload:"payload", topic: "t2",
                    repeat: 0.2, wires:[["n2"]] },
                   {id:"n2", type:"helper"}],
                  function() {
                      var n2 = helper.getNode("n2");
                      var count = 0;
                      n2.on("input", function(msg) {
                          msg.should.have.property('topic', 't2');
                          msg.should.have.property('payload', 'payload');
                          count += 1;
                          if (count > 2) {
                              helper.clearFlows().then(function() {
                                  done();
                              });
                          }
                      });
                  });
    });

    it('should inject once with delay of two seconds and repeatedly', function(done) {
        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                        payload:"",payloadType:"date", repeat: 0.2,
                        once: true, onceDelay: 1.2, wires:[["n2"]] },
                        {id:"n2", type:"helper"}],
                    function() {
                        var n2 = helper.getNode("n2");
                        var count = 0;
                        n2.on("input", function(msg) {
                            msg.should.have.property('topic', 't1');
                            should(msg.payload).be.greaterThan(timestamp.getTime());
                            count += 1;
                            if (count > 2) {
                                helper.clearFlows().then(function() {
                                    done();
                                });
                            }
                        });
                    });
    });

    it('should inject with cron', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject",
                    payloadType:"date", topic: "t3",
                    crontab: "* * * * * *", wires:[["n3"]] },
                   {id:"n3", type:"helper"}],
                  function() {
                      var n3 = helper.getNode("n3");
                      n3.on("input", function(msg) {
                          msg.should.have.property('topic', 't3');
                          msg.should.have.property('payload').be.a.Number();
                          helper.clearFlows().then(function() {
                              done();
                          });
                      });
                  });
    });


    it('should inject multiple properties ', function (done) {
        var flow = [{id: "n1", type: "inject", props: [{p:"topic", v:"t1", vt:"str"}, {p:"payload", v:"foo", vt:"str"}, {p:"x", v: 10, "vt":"num"}, {p:"y", v: "x+2", "vt":"jsonata"}], wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("topic", "t1");
                    msg.should.have.property("payload", "foo");
                    msg.should.have.property("x", 10);
                    msg.should.have.property("y", 12);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });

    
    it('should inject custom properties in message', function (done) {
        //n1: inject node with  { topic:"static", payload:"static", bool1:true, str1:"1" }
        var flow = [{id: "n1", type: "inject", props: [{p:"payload", v:"static", vt:"str"}, {p:"topic", v:"static", vt:"str"}, {p:"bool1", v:"true", vt:"bool"}, {p:"str1", v:"1", vt:"str"}], wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.not.have.property("payload"); //payload removed
                    msg.should.have.property("topic", "t_override"); //changed value to t_override
                    msg.should.have.property("str1", 1);//changed type from str to num
                    msg.should.have.property("num1", 1);//new prop
                    msg.should.have.property("bool1", false);//changed value to false
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({ __user_inject_props__: [
                {p:"topic", v:"t_override", vt:"str"}, //change value to t_override
                {p:"str1", v:"1", vt:"num"}, //change type
                {p:"num1", v:"1", vt:"num"}, //new prop
                {p:"bool1", v:"false", vt:"bool"}, //change value to false
            ]});
        });
    });


    it('should inject multiple properties using legacy props if needed', function (done) {
        var flow = [{id: "n1", type: "inject", payload:"123", payloadType:"num", topic:"foo", props: [{p:"topic", vt:"str"}, {p:"payload"}], wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("topic", "foo");
                    msg.should.have.property("payload", 123);
                    done();
                } catch (err) {
                    done(err);
                }
            });
            n1.receive({});
        });
    });


    it('should report invalid JSONata expression', function (done) {
        var flow = [{id: "n1", type: "inject", props: [{p:"topic", v:"t1", vt:"str"}, {p:"payload", v:"@", vt:"jsonata"}], wires: [["n2"]], z: "flow"},
                    {id: "n2", type: "helper"}];
        helper.load(injectNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property("topic", "t1");
                    msg.should.not.have.property("payload");
                    count++;
                    if (count == 2) {
                        done();
                    }
                } catch (err) {
                    done(err);
                }
            });
            n1.on("call:error", function(err) {
                count++;
                if (count == 1) {
                    done();
                }
            });
            n1.receive({});
        });
    });

    describe('post', function() {
        it('should inject message', function(done) {
            helper.load(injectNode,
                        [{id:"n1", type:"inject",
                          payloadType:"str", topic: "t4",payload:"hello",
                          wires:[["n4"]] },
                         { id:"n4", type:"helper"}], function() {
                             var n4 = helper.getNode("n4");
                             n4.on("input", function(msg) {
                                 msg.should.have.property('topic', 't4');
                                 msg.should.have.property('payload', 'hello');
                                 helper.clearFlows().then(function() {
                                     done();
                                 });
                             });
                             try {
                                 helper.request()
                                 .post('/inject/n1')
                                 .expect(200).end(function(err) {
                                     if (err) {
                                         console.log(err);
                                         return helper.clearFlows()
                                         .then(function () {
                                             done(err);
                                         });
                                     }
                                 });
                             } catch(err) {
                                 done(err);
                             }
                         });
        });

        it('should inject custom properties in posted message', function(done) {
            var flow = [{id:"n1", type:"inject", payloadType:"str", topic: "t4",payload:"hello", wires:[["n4"]] },
                        { id:"n4", type:"helper"}];
            helper.load(injectNode, flow, function() {
                var n4 = helper.getNode("n4");
                n4.on("input", function(msg) {
                    msg.should.not.have.property("payload"); //payload removed
                    msg.should.have.property("topic", "t_override"); //changed value to t_override
                    msg.should.have.property("str1", "1"); //injected prop
                    msg.should.have.property("num1", 1); //injected prop
                    msg.should.have.property("bool1", true); //injected prop
                    msg.should.have.property("jsonata1", "AB"); //injected prop

                    helper.clearFlows().then(function() {
                        done();
                    });
                });
                try {
                    helper.request()
                    .post('/inject/n1')
                    .send({ __user_inject_props__: [
                        {p:"topic", v:"t_override", vt:"str"}, //change value to t_override
                        {p:"str1", v:"1", vt:"str"}, //new prop
                        {p:"num1", v:"1", vt:"num"}, //new prop
                        {p:"bool1", v:"true", vt:"bool"}, //new prop
                        {p:"jsonata1", v:'"A" & "B"', vt:"jsonata"}, //new prop
                    ]})
                    .expect(200).end(function(err) {
                        if (err) {
                            console.log(err);
                            return helper.clearFlows()
                            .then(function () {
                                done(err);
                            });
                        }
                    });
                } catch(err) {
                    done(err);
                }
            });
        });

        it('should fail for invalid node', function(done) {
            helper.request().post('/inject/invalid').expect(404).end(done);
        });
    });
});
