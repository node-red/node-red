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
var rpi = require("../../../../nodes/core/hardware/36-rpi-gpio.js");
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
        helper.load(rpi, flow, function() {
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
        helper.load(rpi, flow, function() {
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

});
