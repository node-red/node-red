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

var switchNode = require("../../../../nodes/core/logic/10-switch.js");
var helper = require("../../helper.js");

describe('switch Node', function() {

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded with some defaults', function(done) {
        var flow = [{"id":"switchNode1","type":"switch","name":"switchNode"}];
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            switchNode1.should.have.property('name', 'switchNode');
            switchNode1.should.have.property('checkall', "true");
            switchNode1.should.have.property('rules', []);
            done();
        });
    });

    /**
     * Test a switch node where one argument is consumed by the rule (such as greater than).
     * @param rule - the switch rule (see 10-switc.js) string we're using
     * @param ruleWith - whatever the rule should be executed with (say greater than 5)
     * @param aCheckall - whether the switch flow should have the checkall flag set to true/false
     * @param shouldReceive - whether the helper node should receive a payload
     * @param sendPayload - the payload message we're sending
     * @param done - callback when done
     */
    function genericSwitchTest(rule, ruleWith, aCheckall, shouldReceive, sendPayload, done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":rule,"v":ruleWith}],checkall:aCheckall,outputs:1,wires:[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        customFlowSwitchTest(flow, shouldReceive, sendPayload, done);
    }
    
    /**
     * Test a switch node where NO arguments are consumed by the rule (such as TRUE/FALSE)
     * @param rule - the switch rule (see 10-switc.js) string we're using
     * @param aCheckall - whether the switch flow should have the checkall flag set to true/false
     * @param shouldReceive - whether the helper node should receive a payload
     * @param sendPayload - the payload message we're sending
     * @param done - callback when done
     */
    function singularSwitchTest(rule, aCheckall, shouldReceive, sendPayload, done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":rule}],checkall:aCheckall,outputs:1,wires:[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        customFlowSwitchTest(flow, shouldReceive, sendPayload, done);
    }
    
    /**
     * Test a switch node where two arguments are consumed by the rule (such as between).
     * @param rule - the switch rule (see 10-switc.js) string we're using
     * @param ruleWith - whatever the rule should be executed with (say between 5...)
     * @param ruleWith2 - whatever the rule should be executed with (say ...and 5)
     * @param aCheckall - whether the switch flow should have the checkall flag set to true/false
     * @param shouldReceive - whether the helper node should receive a payload
     * @param sendPayload - the payload message we're sending
     * @param done - callback when done
     */
    function twoFieldSwitchTest(rule, ruleWith, ruleWith2, aCheckall, shouldReceive, sendPayload, done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":rule,"v":ruleWith,"v2":ruleWith2}],checkall:aCheckall,outputs:1,wires:[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        customFlowSwitchTest(flow, shouldReceive, sendPayload, done);
    }
    
    /**
     * Execute a switch test. Can specify whether the should node is expected to send a payload onwards to the helper node.
     * The flow and the payload can be customised
     * @param flow - the custom flow to be tested => must contain a switch node (switchNode1) wiring a helper node (helperNode1)
     * @param shouldReceive - whether the helper node should receive a payload
     * @param sendPayload - the payload message we're sending
     * @param done - callback when done
     */
    function customFlowSwitchTest(flow, shouldReceive, sendPayload, done) {
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                try {
                    if(shouldReceive === true) {
                        msg.payload.should.equal(sendPayload);
                        done();   
                    } else {
                        should.fail(null, null, "We should never get an input!");
                    }
                } catch(err) {
                    done(err);
                }
            });
            switchNode1.receive({payload:sendPayload});
            if(shouldReceive === false) {
                setTimeout(function() {
                    done();
                }, 200);
            }
        });
    }
    
    it('should check if payload equals given value', function(done) {
        genericSwitchTest("eq", "Hello", true, true, "Hello", done);
    });
    
    it('should return nothing when the payload doesn\'t equal to desired string', function(done) {
        genericSwitchTest("eq", "Hello", true, false, "Hello!", done);
    });
    
    it('should check if payload NOT equals given value', function(done) {
        genericSwitchTest("neq", "Hello", true, true, "HEllO", done);
    });
    
    it('should return nothing when the payload does equal to desired string', function(done) {
        genericSwitchTest("neq", "Hello", true, false, "Hello", done);
    });
    
    it('should check if payload equals given numeric value', function(done) {
        genericSwitchTest("eq", 3, true, true, 3, done);
    });
    
    it('should return nothing when the payload doesn\'t equal to desired numeric value', function(done) {
        genericSwitchTest("eq", 2, true, false, 4, done);
    });
    
    it('should check if payload NOT equals given numeric value', function(done) {
        genericSwitchTest("neq", 55667744, true, true, -1234, done);
    });
    
    it('should return nothing when the payload does equal to desired numeric value', function(done) {
        genericSwitchTest("neq", 10, true, false, 10, done);
    });
    
    it('should check if payload is less than given value', function(done) {
        genericSwitchTest("lt", 3, true, true, 2, done);
    });
    
    it('should return nothing when the payload is not less than desired string', function(done) {
        genericSwitchTest("lt", 3, true, false, 4, done);
    });
    
    it('should check if payload less than equals given value', function(done) {
        genericSwitchTest("lte", 3, true, true, 3, done);
    });
    
    it('should check if payload is greater than given value', function(done) {
        genericSwitchTest("gt", 3, true, true, 6, done);
    });
    
    it('should return nothing when the payload is not greater than desired string', function(done) {
        genericSwitchTest("gt", 3, true, false, -1, done);
    });
    
    it('should check if payload is greater than/equals given value', function(done) {
        genericSwitchTest("gte", 3, true, true, 3, done);
    });
    
    it('should return nothing when the payload is not greater than desired string', function(done) {
        genericSwitchTest("gt", 3, true, false, -1, done);
    });
    
    it('should check if payload is greater than/equals given value', function(done) {
        genericSwitchTest("gte", 3, true, true, 3, done);
    });
    
    it('should check if payload is between given values', function(done) {
        twoFieldSwitchTest("btwn", 3, 5, true, true, 4, done);
    });
    
    it('should check if payload is not between given values', function(done) {
        twoFieldSwitchTest("btwn", 3, 5, true, false, 12, done);
    });
    
    it('should check if payload contains given value', function(done) {
        genericSwitchTest("cont", "Hello", true, true, "Hello World!", done);
    });
    
    it('should return nothing when the payload doesn\'t contain desired string', function(done) {
        genericSwitchTest("cont", "Hello", true, false, "This is not a greeting!", done);
    });
    
    it('should match regex', function(done) {
        genericSwitchTest("regex", "[abc]+", true, true, "abbabac", done);
    });
    
    it('should return nothing when the payload doesn\'t match regex', function(done) {
        genericSwitchTest("regex", "\\d+", true, false, "This is not a digit", done);
    });
    
    it('should return nothing when the payload doesn\'t contain desired string', function(done) {
        genericSwitchTest("cont", "Hello", true, false, "This is not a greeting!", done);
    });
    
    it('should check if input is true', function(done) {
        singularSwitchTest(true, true, true, true, done);
    });
    
    it('sends nothing when input is false and checking for true', function(done) {
        singularSwitchTest(true, true, false, false, done);
    });
    
    it('should check if input is indeed false', function(done) {
        singularSwitchTest(false, true, true, false, done);
    });
    
    it('sends nothing when input is false and checking for true', function(done) {
        singularSwitchTest(false, true, false, true, done);
    });
    
    it('should check if input is indeed null', function(done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":"null"}],checkall:true,outputs:1,wires:[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        
        
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                if(msg.payload) {
                    try {
                        should.fail(null, null, "msg.payload should be undefined!");   
                    } catch (err) {
                        done(err);
                    }
                } else {
                    done();
                }
            });
            switchNode1.receive({payload:undefined});
        });
    });
    
    it('should check if input is indeed not null', function(done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":"nnull"}],checkall:false,outputs:1,wires:[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        
        
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                if(msg.payload) {
                    done();
                } else {
                    try {
                        msg.payload.should.equal("Anything here");
                    } catch (err) {
                        done(err);
                    }
                }
            });
            switchNode1.receive({payload:"Anything here"});
        });
    });
    
    it('sends a message when the "else/otherwise" statement is selected' , function(done) {
        singularSwitchTest("else", true, true, 123456, done);
    });
    
    it('handles more than one switch statement' , function(done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":"eq","v":"Hello"},{"t":"cont","v":"ello"}, {"t":"else"}],checkall:true,outputs:3,wires:[["helperNode1"], ["helperNode2"], ["helperNode3"]]},
                    {id:"helperNode1", type:"helper", wires:[]},
                    {id:"helperNode2", type:"helper", wires:[]},
                    {id:"helperNode3", type:"helper", wires:[]}];
        
        
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var helperNode2 = helper.getNode("helperNode2");
            var helperNode3 = helper.getNode("helperNode3");
            
            var nodeHitCount = 0;
            helperNode1.on("input", function(msg) {
                try {
                    msg.payload.should.equal("Hello");
                    nodeHitCount++;
                } catch (err) {
                    done(err);
                }
            });
            helperNode2.on("input", function(msg) {
                try {
                    msg.payload.should.equal("Hello");
                    nodeHitCount++;
                    if(nodeHitCount == 2) {
                        done();
                    } else {
                        try {
                            should.fail(null, null, "Both statements should be triggered!");   
                        } catch (err) {
                            done(err);
                        }
                    }
                } catch (err) {
                    done(err);
                }
            });
            helperNode3.on("input", function(msg) {
                try {
                    should.fail(null, null, "The otherwise/else statement should not be triggered here!");   
                } catch (err) {
                    done(err);
                }
            });
            switchNode1.receive({payload:"Hello"});
        });
    });
    
    it('stops after first statement' , function(done) {
        var flow = [{id:"switchNode1",type:"switch",name:"switchNode",property:"payload",rules:[{"t":"eq","v":"Hello"},{"t":"cont","v":"ello"}, {"t":"else"}],checkall:"false",outputs:3,wires:[["helperNode1"], ["helperNode2"], ["helperNode3"]]},
                    {id:"helperNode1", type:"helper", wires:[]},
                    {id:"helperNode2", type:"helper", wires:[]},
                    {id:"helperNode3", type:"helper", wires:[]}];
        
        
        helper.load(switchNode, flow, function() {
            var switchNode1 = helper.getNode("switchNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var helperNode2 = helper.getNode("helperNode2");
            var helperNode3 = helper.getNode("helperNode3");
            
            helperNode1.on("input", function(msg) {
                try {
                    msg.payload.should.equal("Hello");
                    done();
                } catch (err) {
                    done(err);
                }
            });
            helperNode2.on("input", function(msg) {
                try {
                    should.fail(null, null, "The otherwise/else statement should not be triggered here!");   
                } catch (err) {
                    done(err);
                }
            });
            helperNode3.on("input", function(msg) {
                try {
                    should.fail(null, null, "The otherwise/else statement should not be triggered here!");   
                } catch (err) {
                    done(err);
                }
            });
            switchNode1.receive({payload:"Hello"});
        });
    });
    
});
