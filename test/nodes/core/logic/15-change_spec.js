/**
 * Copyright 2014, 2015 IBM Corp.
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

var changeNode = require("../../../../nodes/core/logic/15-change.js");
var helper = require("../../helper.js");

var Log = require("../../../../red/log.js");


describe('change Node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should load node with defaults', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1" }];
        helper.load(changeNode, flow, function() {
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [{t:undefined,p:''}]);
            done();
        });
    });
    it('should load defaults if set to replace', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1", action:"replace" }];
        helper.load(changeNode, flow, function() {
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [ { p: '', t: 'set', to: '' } ]);
            done();
        });
    });
    it('should load defaults if set to change', function(done) {
        var flow = [{ id: "c1", type: "change", name:"change1", action:"change"  }];
        helper.load(changeNode, flow, function() {
            //console.log(helper.getNode("c1"));
            helper.getNode("c1").should.have.property("name", "change1");
            helper.getNode("c1").should.have.property("rules", [ { from: /(?:)/g, p: '', re: undefined, t: 'change', to: '' } ]);
            done();
        });
    });

    describe('#replace' , function() {

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
                        (msg.payload === null).should.be.true;
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

        it('Reports invalid regex', function(done) {
            var sinon = require('sinon');
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

    });
});
