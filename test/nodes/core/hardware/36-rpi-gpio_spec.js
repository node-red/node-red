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
var rpiNode    = require("../../../../nodes/core/hardware/36-rpi-gpio.js");
var statusNode = require("../../../../nodes/core/core/25-status.js");
var helper = require("node-red-node-test-helper");
var fs = require("fs");

describe('RPI GPIO Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    var checkIgnore = function(done) {
        setTimeout(function() {
            try {
                var logEvents = helper.log().args.filter(function(evt) {
                    return ((evt[0].level == 30) && (evt[0].msg.indexOf("rpi-gpio")===0));
                });
                logEvents[0][0].should.have.a.property('msg');
                logEvents[0][0].msg.toString().should.startWith("rpi-gpio : rpi-gpio.errors.ignorenode");
                done();
            } catch(err) {
                done(err);
            }
        },25);
    }

    it('should load Input node', function(done) {
        var flow = [{id:"n1", type:"rpi-gpio in", name:"rpi-gpio in" }];
        helper.load(rpiNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'rpi-gpio in');
            try {
                var cpuinfo = fs.readFileSync("/proc/cpuinfo").toString();
                if (cpuinfo.indexOf(": BCM") === 1) {
                    done(); // It's ON a PI ... should really do more tests !
                } else {
                    checkIgnore(done);
                }
            }
            catch(e) {
                checkIgnore(done);
            }
        });
    });

    it('should load Output node', function(done) {
        var flow = [{id:"n1", type:"rpi-gpio out", name:"rpi-gpio out" }];
        helper.load(rpiNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'rpi-gpio out');
            try {
                var cpuinfo = fs.readFileSync("/proc/cpuinfo").toString();
                if (cpuinfo.indexOf(": BCM") === 1) {
                    done(); // It's ON a PI ... should really do more tests !
                } else {
                    checkIgnore(done);
                }
            }
            catch(e) {
                checkIgnore(done);
            }
        });
    });


    it('should read a dummy value high (not on Pi)', function(done) {
        var flow = [{id:"n1", type:"rpi-gpio in", pin:"7", intype:"up", debounce:"25", read:true, wires:[["n2"]] },
        {id:"n2", type:"helper"}];
        helper.load(rpiNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'pi/7');
                    msg.should.have.property('payload', 1);
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should read a dummy value low (not on Pi)', function(done) {
        var flow = [{id:"n1", type:"rpi-gpio in", pin:"11", intype:"down", debounce:"25", read:true, wires:[["n2"]] },
        {id:"n2", type:"helper"}];
        helper.load(rpiNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'pi/11');
                    msg.should.have.property('payload', 0);
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should be able preset out to a dummy value (not on Pi)', function(done) {
        var flow = [{id:"n1", type:"rpi-gpio out", pin:"7", out:"out", level:"0", set:true, freq:"", wires:[], z:"1"},
        {id:"n2", type:"status", scope:null, wires:[["n3"]], z:"1"},
        {id:"n3", type:"helper", z:"1"}];
        helper.load([rpiNode,statusNode], flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            n3.on("input", function(msg) {
                try {
                    msg.should.have.property('status');
                    msg.status.should.have.property('text', "rpi-gpio.status.na");
                    done();
                } catch(err) {
                    done(err);
                }
            });
            n1.receive({payload:"1"});
        });
    });

});
