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
var path = require('path');
var fs = require('fs-extra');
var sinon = require('sinon');
var tailNode = require("../../../../nodes/core/storage/28-tail.js");
var helper = require("../../helper.js");

describe('tail Node', function() {

    var wait = 150;
    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var fileToTail = path.join(resourcesDir,"28-tail-test-file.txt");

    beforeEach(function(done) {
        fs.writeFileSync(fileToTail, "Tail message line 1\nTail message line 2\n");
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload().then(function() {
            fs.unlinkSync(fileToTail);
            helper.stopServer(done);
        });
    });

    it('should be loaded', function(done) {
        var flow = [{id:"tailNode1", type:"tail", name: "tailNode", "split":true, "filename":fileToTail}];
        helper.load(tailNode, flow, function() {
            var tailNode1 = helper.getNode("tailNode1");
            tailNode1.should.have.property('name', 'tailNode');
            done();
        });
    });

    it('should tail a file', function(done) {
        var flow = [{id:"tailNode1", type:"tail", name: "tailNode", "split":true, "filename":fileToTail, "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(tailNode, flow, function() {
            var tailNode1 = helper.getNode("tailNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var inputCounter = 0;
            helperNode1.on("input", function(msg) {
                //console.log(msg);
                msg.should.have.property('topic', fileToTail);
                msg.payload.should.equal("Tail message line " + (++inputCounter + 2));
                if (inputCounter === 2) {
                    done();
                }
            });
            setTimeout( function() {
                fs.appendFileSync(fileToTail, "Tail message line 3\n");
                fs.appendFileSync(fileToTail, "Tail message line 4\n");
            },wait);
        });
    });

    it('should work in non-split mode', function(done) {
        var flow = [{id:"tailNode1", type:"tail", name: "tailNode", "split":false, "filename":fileToTail, "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(tailNode, flow, function() {
            var tailNode1 = helper.getNode("tailNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                //console.log(msg);
                msg.should.have.property('topic', fileToTail);
                msg.payload.should.equal("Tail message line 5\nTail message line 6\n");
                done();
            });
            setTimeout( function() {
                fs.appendFileSync(fileToTail, "Tail message line 5\nTail message line 6\n");
            },wait);
        });
    });

    it('should handle a non-existent file', function(done) {
        fs.unlinkSync(fileToTail);
        var flow = [{id:"tailNode1", type:"tail", name: "tailNode", "split":true, "filename":fileToTail, "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(tailNode, flow, function() {
            var tailNode1 = helper.getNode("tailNode1");
            var helperNode1 = helper.getNode("helperNode1");
            helperNode1.on("input", function(msg) {
                msg.should.have.property('topic', fileToTail);
                msg.payload.should.equal("Tail message line");
                done();
            });
            setTimeout( function() {
                fs.writeFile(fileToTail, "Tail message line\n");
            },wait);
        });
    });

    it('should throw an error if run on Windows', function(done) {
        // Stub os platform so we can make it look like windows
        var os = require('os');
        var spy = sinon.stub(os, 'platform', function(arg){ return("windows"); });

        /*jshint immed: false */
        (function() { tailNode("1234"); }).should.throw();
        os.platform.restore();
        done();
    });

    /*
    it('tail should handle file truncation', function(done) {
        var flow = [{id:"tailNode1", type:"tail", name: "tailNode", "split":true, "filename":fileToTail, "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(tailNode, flow, function() {
            var tailNode1 = helper.getNode("tailNode1");
            var helperNode1 = helper.getNode("helperNode1");
            var inputCounter = 0;
            var warned = false;
            tailNode1.on("log", function(msg) {
                if (msg.level == "warn") { warned = true; }
            });
            helperNode1.on("input", function(msg) {
                console.log("inputCounter =",inputCounter);
                console.log(msg);
                msg.should.have.property('topic', fileToTail);
                inputCounter++;
                if (inputCounter === 1) {
                    warned.should.be.false;
                    msg.payload.should.equal("Tail message line append");
                } else if (inputCounter === 2) {
                    msg.payload.should.equal("Tail message line truncate");
                } else {
                    msg.payload.should.equal("Tail message line append "+inputCounter);
                }

                if (inputCounter === 5) {
                    setTimeout(function() {
                        warned.should.be.true;
                        done();
                    },100);
                }
            });
            var actions = [
                function() { fs.appendFileSync(fileToTail, "Tail message line append\n");},
                function() { fs.writeFileSync(fileToTail, "Tail message line truncate\n");},
                function() { fs.appendFileSync(fileToTail, "Tail message line append 3\n");},
                function() { fs.appendFileSync(fileToTail, "Tail message line append 4\n");},
                function() { fs.appendFileSync(fileToTail, "Tail message line append 5\n");}
            ];

            function processAction() {
                var action = actions.shift();
                action();
                if (actions.length > 0) {
                    setTimeout(function() {
                        processAction();
                    },250);
                }
            }
            setTimeout( function() {
                processAction();
            },wait);
        });
    });
    */

});
