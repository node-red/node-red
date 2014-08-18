/**
 * Copyright 2014 IBM Corp.
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

describe('ChangeNode', function() {
    
    beforeEach(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function(done) {
        var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"","reg":false,"name":"changeNode","wires":[[]]}];
        helper.load(changeNode, flow, function() {
            var changeNode1 = helper.getNode("changeNode1");
            changeNode1.should.have.property('name', 'changeNode');
            done();
        });
    });
    
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
            var changeNode1 = helper.getNode("changeNode1");
            var helperNode1 = helper.getNode("helperNode1");
            
            sinon.stub(changeNode1, 'error', function(error) {
                if(error.indexOf("regular expression" > -1)) {
                    done();
                } else {
                    try {
                        should.fail(null, null, "An error should be reported for an invalid regex");
                    } catch (err) {
                        done(err);
                    }
                }
             });
            changeNode1.receive({payload:"This is irrelevant"});
        });
    });
    
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
    
// TODO confirm the behaviour of the change node later,apparently calling eval such that  makeNew( msg, node.property.split("."), eval(node.to) ); is incorrect
//    it('changes the property name of the message object', function(done) {
//        var flow = [{"id":"changeNode1","type":"change","action":"replace","property":"payload","from":"","to":"msg.otherProp=10","reg":false,"name":"changeNode","wires":[["helperNode1"]]},
//                    {id:"helperNode1", type:"helper", wires:[]}];
//        helper.load(changeNode, flow, function() {
//            var changeNode1 = helper.getNode("changeNode1");
//            var helperNode1 = helper.getNode("helperNode1");
//            helperNode1.on("input", function(msg) {
//                try {
//                    msg.otherProp.should.equal(10);
//                    done();
//                } catch(err) {
//                    done(err);
//                }
//            });
//            changeNode1.receive({payload:"changeMe"});
//        });
//    });
    
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
            changeNode1.receive({"pay.load":"changeMe"});
        });
    });
});

