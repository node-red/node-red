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
var path = require("path");
var fs = require('fs-extra');

var htmlNode = require("../../../../nodes/core/parsers/70-HTML.js");
var helper = require("../../helper.js");

describe('html node', function() {

    var resourcesDir = __dirname+ path.sep + ".." + path.sep + ".." + path.sep + ".." + path.sep + "resources" + path.sep;
    var file = path.join(resourcesDir, "70-HTML-test-file.html");

    before(function(done) {
        helper.startServer(done);
    });

    beforeEach(function() {
        fs.existsSync(file).should.be.true();
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"htmlNode1", type:"html", name: "htmlNode" }];
        helper.load(htmlNode, flow, function() {
            var htmlNode1 = helper.getNode("htmlNode1");
            htmlNode1.should.have.property('name', 'htmlNode');
            done();
        });
    });

    it('should retrieve header contents if asked to by msg.select', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],func:"return msg;"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    should.equal(msg.payload, 'This is a test page for node 70-HTML');
                    done();
                });
                n1.receive({payload:data,topic:"bar",select:"h1"});
            });
        });
    });

    it('should retrieve paragraph contents when specified', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],ret:"text",tag:"p"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    should.equal(msg.payload, 'There\'s nothing to read here.');
                    done();
                });
                n1.receive({payload:data,topic: "bar"});
            });
        });
    });

    it('should retrieve list contents as an array of html as default', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ol"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.payload[0].indexOf("<li>Blue</li>").should.be.above(-1);
                    msg.payload[0].indexOf("<li>Red</li>").should.be.above(-1);
                    done();
                });
                n1.receive({payload:data,topic: "bar"});
            });
        });
    });

    it('should retrieve list contents as an array of text', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ol",ret:"text"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.payload[0].indexOf("Blue").should.be.above(-1);
                    msg.payload[0].indexOf("Red").should.be.above(-1);
                    done();

                });
                n1.receive({payload:data,topic: "bar"});
            });
        });
    });

    it('should fix up a unclosed tag', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"span"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    should.equal(msg.payload, '<img src="foo.png"/>');
                    done();
                });
                n1.receive({payload:data,topic: "bar"});
            });
        });
    });

    it('should retrive an attribute from a tag', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],ret:"attr",tag:"span img"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload');
                    msg.payload[0].should.have.property('src','foo.png');
                    msg.should.have.property('topic', 'bar');
                    done();
                });
                n1.receive({payload:data,topic: "bar"});
            });
        });
    });

    it('should log on error', function(done) {
        fs.readFile(file,function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"p"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                try {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n1.receive({payload:null,topic: "bar"});
                    helper.log().called.should.be.true();
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "html";
                    });
                    logEvents.should.have.length(1);
                    // Each logEvent is the array of args passed to the function.
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].should.have.a.property('level',helper.log().ERROR);

                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
    });

    it('should pass through if payload empty', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],func:"return msg;"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.not.have.property('payload');
                    done();
                });
                n1.receive({topic: "bar"});
            });
        });
    });

    describe('multiple messages', function(){
        var cnt = 0;

        afterEach(function() {
            cnt.should.be.exactly(2);
            cnt = 0;
        });

        it('should retrieve list contents as html as default with output as multiple msgs ', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ul",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        cnt++;
                        msg.should.have.property('topic', 'bar');
                        if (cnt !== 1 && cnt !== 2) {
                            return false;
                        }
                        if (cnt === 1) {
                            msg.payload.indexOf("<li>Apple</li>").should.be.above(-1);
                            msg.payload.indexOf("<li>Pear</li>").should.be.above(-1);
                        } else if (cnt === 2) {
                            msg.payload.indexOf("<li>Potato</li>").should.be.above(-1);
                            msg.payload.indexOf("<li>Parsnip</li>").should.be.above(-1);
                            done();
                        }
                    });
                    n1.receive({payload:data,topic: "bar"});
                });
            });
        });

        it('should retrieve list contents as text with output as multiple msgs ', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ul",ret:"text",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        cnt++;
                        msg.should.have.property('topic', 'bar');
                        if (cnt !== 1 && cnt !== 2) {
                            return false;
                        }
                        if (cnt === 1) {
                            msg.payload.indexOf("Apple").should.be.above(-1);
                            msg.payload.indexOf("Pear").should.be.above(-1);
                        } else if (cnt === 2) {
                            msg.payload.indexOf("Potato").should.be.above(-1);
                            msg.payload.indexOf("Parsnip").should.be.above(-1);
                            done();
                        }
                    });
                    n1.receive({payload:data,topic: "bar"});
                });
            });
        });

        it('should retrieve an attribute from a tag', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",wires:[["n2"]],ret:"attr",tag:"span img",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('src','foo.png');
                        msg.should.have.property('topic', 'bar');
                        cnt = 2;  // frig the answer as only one img tag
                        done();
                    });
                    n1.receive({payload:data,topic: "bar"});
                });
            });
        });

    });

});
