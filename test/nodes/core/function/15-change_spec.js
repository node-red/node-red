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
var sinon = require("sinon");

var changeNode = require("nr-test-utils").require("@node-red/nodes/core/function/15-change.js");
var Context = require("nr-test-utils").require("@node-red/runtime/lib/nodes/context");
var helper = require("node-red-node-test-helper");

describe('change Node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
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

    afterEach(function(done) {
        helper.unload().then(function () {
            return Context.clean({allNodes: {}});
        }).then(function () {
            return Context.close();
        }).then(function () {
            helper.stopServer(done);
        });
    });

    it('should load node with defaults', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1" }];
        helper.load(changeNode, flow, function() {
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [{fromt:'str',pt:'msg',tot:'str',t:undefined,p:''}]);
            done();
        });
    });
    it('should load defaults if set to replace', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1", action:"replace" }];
        helper.load(changeNode, flow, function() {
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [ {fromt: 'str', p: '', pt: 'msg', t: 'set', to: '', tot: 'str'} ]);
            done();
        });
    });
    it('should load defaults if set to change', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1", action:"change" }];
        helper.load(changeNode, flow, function() {
            //console.log(helper.getNode("c1"));
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [ { from: '', fromRE:/(?:)/g,fromt: 'str', p: '',pt: 'msg', re: undefined, t: 'change', to: '',tot: 'str' } ]);
            done();
        });
    });
    it('should no-op if there are no rules', function(done) {
        var flow = [{"id":"changeNode1","type":"change","rules":[],"action":"","property":"","from":"","to":"","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(changeNode, flow, function() {
            var changeNode1 = helper.getNode("changeNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                try {
                    msg.should.eql(sentMsg);
                    done();
                } catch(err) {
                    done(err);
                }
            });
            var sentMsg = {payload:"leaveMeAlong"};
            changeNode1.receive(sentMsg);
        });
    });

    describe('#set' , function() {

        it('sets the value of the message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"changed","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("changed");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"changeMe"});
            });
        });

        it('sets the value of global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t":"set","p":"globalValue","pt":"global","to":"changed","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        changeNode1.context().global.get("globalValue").should.equal("changed");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("globalValue","changeMe");
                changeNode1.receive({payload:""});
            });
        });

        it('sets the value of persistable global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t":"set","p":"#:(memory1)::globalValue","pt":"global","to":"changed","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            changeNode1.context().global.get("globalValue", "memory1", function (err, val) {
                                val.should.equal("changed");
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("globalValue","changeMe","memory1", function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('sets the value and type of the message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "set", "p": "payload", "pt": "msg", "to": "12345", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal(12345);
                        var t = typeof(msg.payload);
                        t.should.equal("number");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"changeMe"});
            });
        });

        it('sets the value of an already set multi-level message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"foo.bar","from":"","to":"bar","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.foo.bar.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({foo:{bar:"foo"}});
            });
        });

        it('sets the value of an empty multi-level message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"foo.bar","from":"","to":"bar","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.foo.bar.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({});
            });
        });

        it('sets the value of a message property to another message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"foo","from":"","to":"msg.fred","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                var rule = helper.getNode("changeNode1").rules[0];
                rule.t.should.eql('set');
                rule.tot.should.eql('msg');
                helperNode1.on("input", function(msg) {
                    try {
                        msg.foo.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({fred:"bar"});
            });
        });

        it('sets the value of a multi-level message property to another multi-level message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"foo.bar","from":"","to":"msg.fred.red","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.foo.bar.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({fred:{red:"bar"}});
            });
        });

        it('doesn\'t set the value of a message property when the \'to\' message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"foo.bar","from":"","to":"msg.fred.red","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        should.not.exist(msg.foo);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({});
            });
        });

        it('overrides the value of a message property when the \'to\' message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"msg.foo","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        should.not.exist(msg.payload);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello"});
            });
        });

        it('sets the message property to null when the \'to\' message property equals null', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"msg.foo","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        (msg.payload === null).should.be.true();
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello", foo:null});
            });
        });

        it('does not set other properties using = inside to property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"msg.otherProp=10","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
            {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        should.not.exist(msg.payload);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"changeMe"});
            });
        });

        it('splits dot delimited properties into objects', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"pay.load","from":"","to":"10","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.pay.load.should.equal("10");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({pay:{load:"changeMe"}});
            });
        });

        it('changes the value to flow context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"flowValue","tot":"flow"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql("Hello World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("flowValue","Hello World!");
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value to persistable flow context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"#:(memory1)::flowValue","tot":"flow"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.eql("Hello World!");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("flowValue","Hello World!","memory1",function(err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value to global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"globalValue","tot":"global"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql("Hello World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("globalValue","Hello World!");
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value to persistable global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"#:(memory1)::globalValue","tot":"global"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.eql("Hello World!");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("globalValue","Hello World!","memory1", function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value to a number', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"123","tot":"num"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql(123);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value to a boolean value', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"true","tot":"bool"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql(true);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value to a js object', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":'{"a":123}',"tot":"json"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql({a:123});
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value to a buffer object', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"[72,101,108,108,111,32,87,111,114,108,100]","tot":"bin"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        var buff = Buffer.from("Hello World");
                        msg.payload.should.eql(buff);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:""});
            });
        });

        it('sets the value of the message property to the current timestamp', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"set","p":"ts","pt":"msg","to":"","tot":"date"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        (Date.now() - msg.ts).should.be.approximately(0,50);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:Date.now()});
            });
        });

        describe('env var', function() {
            before(function() {
                process.env.NR_TEST_A = 'foo';
            })
            after(function() {
                delete process.env.NR_TEST_A;
            })
            it('sets the value using env property', function(done) {
                var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","pt":"msg","to":"NR_TEST_A","tot":"env"}],"name":"changeNode","wires":[["helperNode1"]]},
                {id:"helperNode1", type:"helper", wires:[]}];
                helper.load(changeNode, flow, function() {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("foo");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.receive({payload:"123",topic:"ABC"});
                });
            });

            it('sets the value using env property from tab', function(done) {
                var flow = [
                    {"id":"tab1","type":"tab","env":[
                        {"name":"NR_TEST_A", "value":"bar", "type": "str"}
                    ]},
                    {"id":"changeNode1","type":"change","z":"tab1",rules:[{"t":"set","p":"payload","pt":"msg","to":"NR_TEST_A","tot":"env"}],"name":"changeNode","wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}
                ];
                helper.load(changeNode, flow, function() {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.receive({payload:"123",topic:"ABC"});
                });
            });

            it('sets the value using env property from group', function(done) {
                var flow = [
                    {"id": "flow", type:"tab"},
                    {"id":"group1","type":"group","env":[
                        {"name":"NR_TEST_A", "value":"bar", "type": "str"}
                    ], z: "flow"},
                    {"id":"changeNode1","type":"change","g":"group1",rules:[{"t":"set","p":"payload","pt":"msg","to":"NR_TEST_A","tot":"env"}],"name":"changeNode","wires":[["helperNode1"]], z: "flow"},
                    {id:"helperNode1", type:"helper", wires:[], z: "flow"}
                ];
                helper.load(changeNode, flow, function() {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.receive({payload:"123",topic:"ABC"});
                });
            });

            it('sets the value using env property from nested group', function(done) {
                var flow = [
                    {"id": "flow", type:"tab"},
                    {"id":"group1","type":"group","env":[
                        {"name":"NR_TEST_A", "value":"bar", "type": "str"}
                    ], z: "flow"},
                    {"id":"group2","type":"group","g":"group1","env":[], z: "flow"},
                    {"id":"changeNode1","type":"change","g":"group2",rules:[{"t":"set","p":"payload","pt":"msg","to":"NR_TEST_A","tot":"env"}],"name":"changeNode","wires":[["helperNode1"]], z: "flow"},
                    {id:"helperNode1", type:"helper", wires:[], z: "flow"}
                ];
                helper.load(changeNode, flow, function() {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.receive({payload:"123",topic:"ABC"});
                });
            });

        });

        it('changes the value using jsonata', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$length(payload)","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql(12);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('reports invalid jsonata expression', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$invalid(payload)","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    done("Invalid jsonata expression passed message through");
                });
                changeNode1.on("call:error", function(err) {
                    // Expect error to be called
                    done();
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('changes the value using flow context with jsonata', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$flowContext(\"foo\")","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"},{"id":"flow","type":"tab"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                changeNode1.context().flow.set("foo","bar");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('changes the value using global context with jsonata', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$globalContext(\"foo\")","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"},{"id":"flow","type":"tab"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                changeNode1.context().global.set("foo","bar");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('changes the value using persistable flow context with jsonata', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$flowContext(\"foo\",\"memory1\")","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"},{"id":"flow","type":"tab"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.eql("bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("foo","bar","memory1",function(err){
                        if(err){
                            done(err);
                        }else{
                            changeNode1.context().flow.set("foo","error!");
                            changeNode1.receive({payload:"Hello World!"});
                        }
                    });
                });
            });
        });

        it('changes the value using persistable global context with jsonata', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"set","p":"payload","to":"$globalContext(\"foo\",\"memory1\")","tot":"jsonata"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"},{"id":"flow","type":"tab"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.eql("bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("foo","bar","memory1",function(err){
                        if(err){
                            done(err);
                        }else{
                            changeNode1.context().global.set("foo","error!");
                            changeNode1.receive({payload:"Hello World!"});
                        }
                    });
                });
            });
        });

        it('sets the value of a message property using a nested property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"lookup[msg.topic]","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];

            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal(2);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"",lookup:{a:1,b:2},topic:"b"});
            });
        });

        it('sets the value of a nested message property using a message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","name":"","rules":[{"t":"set","p":"lookup[msg.topic]","pt":"msg","to":"payload","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];

            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.lookup.b.should.equal("newValue");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                var msg = {
                    payload: "newValue",
                    lookup:{a:1,b:2},
                    topic:"b"
                }
                changeNode1.receive(msg);
            });
        });

        it('sets the value of a message property using a nested property in flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"lookup[msg.topic]","tot":"flow"}],"action":"","property":"","from":"","to":"","reg":false,"wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];

            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql(2);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("lookup",{a:1, b:2});
                changeNode1.receive({payload: "", topic: "b"});
            });
        })

        it('sets the value of a message property using a nested property in flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"lookup[msg.topic]","tot":"flow"}],"action":"","property":"","from":"","to":"","reg":false,"wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];

            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql(2);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("lookup",{a:1, b:2});
                changeNode1.receive({payload: "", topic: "b"});
            });
        })

        it('sets the value of a nested flow context property using a message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","name":"","rules":[{"t":"set","p":"lookup[msg.topic]","pt":"flow","to":"payload","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];

            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.eql("newValue");
                        changeNode1.context().flow.get("lookup.b").should.eql("newValue");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("lookup",{a:1, b:2});
                changeNode1.receive({payload: "newValue", topic: "b"});
            });
        })

        it('deep copies the property if selected', function(done) {

            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"set","p":"payload","pt":"msg","to":"source","tot":"msg","dc":true}],"name":"changeNode","wires":[["helperNode1"]]},
            {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        // Check payload has been set to a clone of original object
                        // - the JSON should match
                        JSON.stringify(msg.payload).should.equal(JSON.stringify(originalObject))
                        // - but they must be different objects
                        msg.payload.should.not.equal(originalObject);

                        // Modify nested property of original object
                        originalObject.a.c = 3;
                        // Check that modification hasn't happened on cloned prop
                        msg.payload.a.should.not.have.property('c');

                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                var originalObject = { a: { b: 2 } }
                changeNode1.receive({source:originalObject});
            });

        })
    });
    describe('#change', function() {
        it('changes the value of the message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"payload","from":"Hello","to":"Goodbye","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Goodbye World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('changes the value and doesnt change type of the message property for partial match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "msg", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Change456Me");
                        var t = typeof(msg.payload);
                        t.should.equal("string");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Change123Me"});
            });
        });

        it('changes the value and type of the message property if a complete match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "msg", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal(456);
                        var t = typeof(msg.payload);
                        t.should.equal("number");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"123"});
            });
        });

        it('changes the value of a multi-level message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"foo.bar","from":"Hello","to":"Goodbye","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.foo.bar.should.equal("Goodbye World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({foo:{bar:"Hello World!"}});
            });
        });

        it('sends unaltered message if the changed message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"foo","from":"Hello","to":"Goodbye","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Hello World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('sends unaltered message if a changed multi-level message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"foo.bar","from":"Hello","to":"Goodbye","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Hello World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World!"});
            });
        });

        it('changes the value of the message property based on a regex', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"payload","from":"\\d+","to":"NUMBER","reg":true,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Replace all numbers NUMBER and NUMBER");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Replace all numbers 12 and 14"});
            });
        });

        it('supports regex groups', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"payload","from":"(Hello)","to":"$1-$1-$1","reg":true,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Hello-Hello-Hello World");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World"});
            });
        });

        it('reports invalid regex', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"change","property":"payload","from":"\\+**+","to":"NUMBER","reg":true,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var logEvents = helper.log().args.filter(function (evt) {
                    return evt[0].type == "change";
                });
                logEvents.should.have.length(1);
                var msg = logEvents[0][0];
                msg.should.have.property('level', helper.log().ERROR);
                msg.should.have.property('id', 'changeNode1');
                done();

            });
        });

        it('supports regex groups - new rule format', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"(Hello)","to":"$1-$1-$1","fromt":"re","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("Hello-Hello-Hello World");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"Hello World"});
            });
        });

        it('changes the value - new rule format', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"ABC","to":"123","fromt":"str","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("abc123abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"abcABCabc"});
            });
        });

        it('changes the value using msg property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"topic","to":"123","fromt":"msg","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("abc123abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"abcABCabc",topic:"ABC"});
            });
        });

        it('changes the value using flow context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"topic","to":"123","fromt":"flow","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("abc123abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("topic","ABC");
                changeNode1.receive({payload:"abcABCabc"});
            });
        });

        it('changes the value using persistable flow context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"#:(memory1)::topic","to":"123","fromt":"flow","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("abc123abc");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("topic","ABC","memory1", function (err) {
                        changeNode1.receive({payload:"abcABCabc"});
                    });
                });
            });
        });

        it('changes the value using global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"topic","to":"123","fromt":"global","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("abc123abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("topic","ABC");
                changeNode1.receive({payload:"abcABCabc"});
            });
        });

        it('changes the value using persistable global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"#:(memory1)::topic","to":"123","fromt":"global","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("abc123abc");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("topic","ABC","memory1",function (err) {
                        changeNode1.receive({payload:"abcABCabc"});
                    });
                });
            });
        });

        it('changes the number using global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"topic","to":"ABC","fromt":"global","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("ABC");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("topic",123);
                changeNode1.receive({payload:123});
            });
        });

        it('changes the number using persistable global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"#:(memory1)::topic","to":"ABC","fromt":"global","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("ABC");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("topic",123,"memory1",function (err) {
                        changeNode1.receive({payload:123});
                    });
                });
            });
        });

        it('changes the value using number - string payload', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"123","to":"456","fromt":"num","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("456");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"123"});
            });
        });

        it('changes the value using number - number payload', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"123","to":"abc","fromt":"num","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:123});
            });
        });

        it('changes the value using boolean - string payload', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"true","to":"xxx","fromt":"bool","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("xxx");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"true"});
            });
        });

        it('changes the value using boolean - boolean payload', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"true","to":"xxx","fromt":"bool","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("xxx");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:true});
            });
        });

        it('changes the value of the global context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "global", "from": "Hello", "fromt": "str", "to": "Goodbye", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        helperNode1.context().global.get("payload").should.equal("Goodbye World!");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("payload","Hello World!");
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value of the persistable global context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "#:(memory1)::payload", "pt": "global", "from": "Hello", "fromt": "str", "to": "Goodbye", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            helperNode1.context().global.get("payload","memory1", function (err, val) {
                                val.should.equal("Goodbye World!");
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("payload","Hello World!","memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value and doesnt change type of the flow context for partial match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "flow", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        helperNode1.context().flow.get("payload").should.equal("Change456Me");
                        helperNode1.context().flow.get("payload").should.be.a.String();
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("payload","Change123Me");
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value and doesnt change type of the persistable flow context for partial match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "#:(memory1)::payload", "pt": "flow", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            helperNode1.context().flow.get("payload","memory1",function (err,  val) {
                                val.should.equal("Change456Me");
                                val.should.be.a.String();
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("payload","Change123Me","memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value and type of the flow context if a complete match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "flow", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        helperNode1.context().flow.get("payload").should.equal(456);
                        helperNode1.context().flow.get("payload").should.be.a.Number();
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("payload","123");
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value and type of the persistable flow context if a complete match', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "#:(memory1)::payload", "pt": "flow", "from": "123", "fromt": "str", "to": "456", "tot": "num" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            helperNode1.context().flow.get("payload","memory1",function (err, val) {
                                val.should.be.a.Number();
                                val.should.equal(456);
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("payload","123","memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value using number - number flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "flow", "from": "123", "fromt": "num", "to": "abc", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        helperNode1.context().flow.get("payload").should.equal("abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("payload",123);
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value using number - number persistable flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "#:(memory1)::payload", "pt": "flow", "from": "123", "fromt": "num", "to": "abc", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            helperNode1.context().flow.get("payload","memory1",function (err, val) {
                                val.should.equal("abc");
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("payload",123,"memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('changes the value using boolean - boolean flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "payload", "pt": "flow", "from": "true", "fromt": "bool", "to": "abc", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        helperNode1.context().flow.get("payload").should.equal("abc");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().flow.set("payload",true);
                changeNode1.receive({payload:""});
            });
        });

        it('changes the value using boolean - boolean persistable flow context', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "change", "p": "#:(memory1)::payload", "pt": "flow", "from": "true", "fromt": "bool", "to": "abc", "tot": "str" }],"reg":false,"name":"changeNode","wires":[["helperNode1"]],"z":"flow"},
                        {id:"helperNode1", type:"helper", wires:[],"z":"flow"}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            helperNode1.context().flow.get("payload","memory1",function (err, val) {
                                val.should.equal("abc");
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().flow.set("payload",true,"memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('reports invalid fromValue', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"null","fromt":"msg","to":"abc","tot":"str"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "change";
                    });
                    logEvents.should.have.length(1);
                    var msg = logEvents[0][0];
                    msg.should.have.property('level', helper.log().ERROR);
                    msg.should.have.property('id', 'changeNode1');
                    done();
                },25);
                changeNode1.receive({payload:"",null:null});
            });
        });

        describe('env var', function() {
            before(function() {
                process.env.NR_TEST_A = 'foo';
            })
            after(function() {
                delete process.env.NR_TEST_A;
            })
            it('changes the value using env property', function(done) {
                var flow = [{"id":"changeNode1","type":"change",rules:[{"t":"change","p":"payload","from":"topic","to":"NR_TEST_A","fromt":"msg","tot":"env"}],"name":"changeNode","wires":[["helperNode1"]]},
                {id:"helperNode1", type:"helper", wires:[]}];
                helper.load(changeNode, flow, function() {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.payload.should.equal("abcfooabc");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.receive({payload:"abcABCabc",topic:"ABC"});
                });
            });
        });

    });

    describe("#delete", function() {
        it('deletes the value of the message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"delete","property":"payload","from":"","to":"","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('payload');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"This won't get through!"});
            });
        });

        it('deletes the value of global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "delete", "p": "globalValue", "pt": "global"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        changeNode1.context().global.should.not.have.property("globalValue");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.context().global.set("globalValue","Hello World!");
                changeNode1.receive({payload:""});
            });
        });

        it('deletes the value of persistable global context property', function(done) {
            var flow = [{"id":"changeNode1","type":"change",rules:[{ "t": "delete", "p": "#:(memory1)::globalValue", "pt": "global"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            changeNode1.context().global.get("globalValue","memory1",function(err,val) {
                                should.equal(undefined);
                                done();
                            });
                        } catch(err) {
                            done(err);
                        }
                    });
                    changeNode1.context().global.set("globalValue","Hello World!","memory1",function (err) {
                        changeNode1.receive({payload:""});
                    });
                });
            });
        });

        it('deletes the value of a multi-level message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"delete","property":"foo.bar","from":"","to":"","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('foo.bar');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"This won't get through!", foo:{bar:"This will be deleted!"}});
            });
        });

        it('sends unaltered message if the deleted message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"delete","property":"foo","from":"","to":"","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('foo');
                        msg.payload.should.equal('payload');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"payload"});
            });
        });

        it('sends unaltered message if a deleted multi-level message property does not exist', function(done) {
            var flow = [{"id":"changeNode1","type":"change","action":"delete","property":"foo.bar","from":"","to":"","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('foo.bar');
                        msg.payload.should.equal('payload');
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"payload"});
            });
        });
    });

    describe("#move", function() {
        it('moves the value of the message property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"move","p":"topic","pt":"msg","to":"payload","tot":"msg"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('topic');
                        msg.should.have.property('payload');
                        msg.payload.should.equal("You've got to move it move it.");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({topic:"You've got to move it move it.", payload:{foo:"bar"}});
            });
        });
        it('moves the value of a message property object', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"move","p":"topic","pt":"msg","to":"payload","tot":"msg"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('topic');
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('foo');
                        msg.payload.foo.should.have.property('bar');
                        msg.payload.foo.bar.should.equal(1);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({topic:{foo:{bar:1}}, payload:"String"});
            });
        });
        it('moves the value of a message property object to itself', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"move","p":"payload","pt":"msg","to":"payload","tot":"msg"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"bar"});
            });
        });
        it('moves the value of a message property object to a sub-property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"move","p":"payload","pt":"msg","to":"payload.foo","tot":"msg"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('foo');
                        msg.payload.foo.should.equal("bar");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:"bar"});
            });
        });
        it('moves the value of a message sub-property object to a property', function(done) {
            var flow = [{"id":"changeNode1","type":"change","rules":[{"t":"move","p":"payload.foo","pt":"msg","to":"payload","tot":"msg"}],"name":"changeNode","wires":[["helperNode1"]]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.equal("bar");
                        (typeof msg.payload).should.equal("string");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({payload:{foo:"bar"}});
            });
        });
    });

    describe('- multiple rules', function() {
        it('handles multiple rules', function(done) {
            var flow = [{"id":"changeNode1","type":"change","wires":[["helperNode1"]],
                        rules:[
                            {t:"set",p:"payload",to:"newValue"},
                            {t:"change",p:"changeProperty",from:"this",to:"that"},
                            {t:"delete",p:"deleteProperty"}
                        ]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("newValue");
                        msg.changeProperty.should.equal("change that value");
                        should.not.exist(msg.deleteProperty);
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({
                    payload:"changeMe",
                    changeProperty:"change this value",
                    deleteProperty:"delete this value"
                });
            });
        });

        it('applies multiple rules in order', function(done) {
            var flow = [{"id":"changeNode1","type":"change","wires":[["helperNode1"]],
                        rules:[
                            {t:"set",p:"payload",to:"a this (hi)"},
                            {t:"change",p:"payload",from:"this",to:"that"},
                            {t:"change",p:"payload",from:"\\(.*\\)",to:"[new]",re:true},
                        ]},
                        {id:"helperNode1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                var changeNode1 = helper.getNode("changeNode1");
                var helperNode1 = helper.getNode("helperNode1");
                helperNode1.on("input", function(msg) {
                    try {
                        msg.payload.should.equal("a that [new]");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                changeNode1.receive({
                    payload:"changeMe"
                });
            });
        });

        it('can access two persistable flow context property', function(done) {
            var flow = [{"id":"changeNode1", "z":"t1", "type":"change",
                         "wires":[["helperNode1"]],
                         rules:[
                             {"t":"set", "p":"val0", "to":"#:(memory0)::val", "tot":"flow"},
                             {"t":"set", "p":"val1", "to":"#:(memory1)::val", "tot":"flow"}
                        ]},
                        {id:"helperNode1", "z":"t1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.should.have.property("val0", "foo");
                            msg.should.have.property("val1", "bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    var flow = changeNode1.context().flow;
                    flow.set("val", "foo", "memory0", function (err) {
                        flow.set("val", "bar", "memory1", function (err) {
                            changeNode1.receive({payload:""});
                        });
                    });
                });
            });
        });

        it('can access two persistable global context property', function(done) {
            var flow = [{"id":"changeNode1", "z":"t1", "type":"change",
                         "wires":[["helperNode1"]],
                         rules:[
                             {"t":"set", "p":"val0", "to":"#:(memory0)::val", "tot":"global"},
                             {"t":"set", "p":"val1", "to":"#:(memory1)::val", "tot":"global"}
                         ]},
                        {id:"helperNode1", "z":"t1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.should.have.property("val0", "foo");
                            msg.should.have.property("val1", "bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    var global = changeNode1.context().global;
                    global.set("val", "foo", "memory0", function (err) {
                        global.set("val", "bar", "memory1", function (err) {
                            changeNode1.receive({payload:""});
                        });
                    });
                });
            });
        });

        it('can access persistable global & flow context property', function(done) {
            var flow = [{"id":"changeNode1", "z":"t1", "type":"change",
                         "wires":[["helperNode1"]],
                         rules:[
                             {"t":"set", "p":"val0", "to":"#:(memory0)::val", "tot":"flow"},
                             {"t":"set", "p":"val1", "to":"#:(memory1)::val", "tot":"global"}
                         ]},
                        {id:"helperNode1", "z":"t1", type:"helper", wires:[]}];
            helper.load(changeNode, flow, function() {
                initContext(function () {
                    var changeNode1 = helper.getNode("changeNode1");
                    var helperNode1 = helper.getNode("helperNode1");
                    helperNode1.on("input", function(msg) {
                        try {
                            msg.should.have.property("val0", "foo");
                            msg.should.have.property("val1", "bar");
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    var context = changeNode1.context();
                    var flow = context.flow;
                    var global = context.global;
                    flow.set("val", "foo", "memory0", function (err) {
                        global.set("val", "bar", "memory1", function (err) {
                            changeNode1.receive({payload:""});
                        });
                    });
                });
            });
        });

    });
});
