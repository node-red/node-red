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
var path = require("path");
var fs = require('fs-extra');

var htmlNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-HTML.js");
var helper = require("node-red-node-test-helper");

describe('HTML node', function() {

    var resourcesDir = __dirname+ path.sep + ".." + path.sep + ".." + path.sep + ".." + path.sep + "resources" + path.sep;
    var file = path.join(resourcesDir, "70-HTML-test-file.html");

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
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

    it('should retrieve header contents if asked to by msg.select - alternative in property', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",property:"foo",wires:[["n2"]],func:"return msg;"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.foo[0].should.equal('This is a test page for node 70-HTML');
                    done();
                });
                n1.receive({foo:data,topic:"bar",select:"h1"});
            });
        });
    });

    it('should retrieve header contents if asked to by msg.select - alternative in and out properties', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",property:"foo",outproperty:"bar",tag:"h1",wires:[["n2"]],func:"return msg;"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.bar[0].should.equal('This is a test page for node 70-HTML');
                    done();
                });
                n1.receive({foo:data,topic:"bar"});
            });
        });
    });

    it('should emit an empty array if no matching elements', function(done) {
        fs.readFile(file, 'utf8', function(err, data) {
            var flow = [{id:"n1",type:"html",wires:[["n2"]],func:"return msg;"},
                        {id:"n2", type:"helper"}];

            helper.load(htmlNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('payload');
                    msg.payload.should.be.empty;
                    done();
                });
                n1.receive({payload:data,topic:"bar",select:"h4"});
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

    it('should retrieve an attribute from a tag', function(done) {
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
                    setTimeout(function() {
                        try {
                            helper.log().called.should.be.true();
                            var logEvents = helper.log().args.filter(function(evt) {
                                return evt[0].type == "html";
                            });
                            logEvents.should.have.length(1);
                            // Each logEvent is the array of args passed to the function.
                            logEvents[0][0].should.have.a.property('msg');
                            logEvents[0][0].should.have.a.property('level',helper.log().ERROR);

                            done();
                        } catch(err) { done(err) }
                    },50);
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
        var parts_id = undefined;

        afterEach(function() {
            cnt.should.be.exactly(2);
            cnt = 0;
            parts_id = undefined;
        });

        function check_parts(msg, index, count) {
            msg.should.have.property('parts');
            msg.parts.should.have.property('id');
            if(parts_id === undefined) {
                parts_id = msg.parts.id;
            }
            else {
                msg.parts.should.have.property('id', parts_id);
            }
            msg.parts.should.have.property('index', index);
            msg.parts.should.have.property('count', count);
            msg.parts.should.have.property('type', 'string');
            msg.parts.should.have.property('ch', '');
        }

        it('should retrieve list contents as html as default with output as multiple msgs', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ul",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        cnt++;
                        msg.should.have.property('topic', 'bar');
                        check_parts(msg, cnt -1, 2);
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


        it('should retrieve list contents as html as default with output as multiple msgs - alternative property', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",property:"foo",wires:[["n2"]],tag:"ul",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        cnt++;
                        msg.should.have.property('topic', 'bar');
                        check_parts(msg, cnt -1, 2);
                        if (cnt !== 1 && cnt !== 2) {
                            return false;
                        }
                        if (cnt === 1) {
                            msg.foo.indexOf("<li>Apple</li>").should.be.above(-1);
                            msg.foo.indexOf("<li>Pear</li>").should.be.above(-1);
                        } else if (cnt === 2) {
                            msg.foo.indexOf("<li>Potato</li>").should.be.above(-1);
                            msg.foo.indexOf("<li>Parsnip</li>").should.be.above(-1);
                            done();
                        }
                    });
                    n1.receive({foo:data, topic:"bar"});
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
                        check_parts(msg, cnt -1, 2);
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
                        check_parts(msg, 0, 1);
                        cnt = 2;  // frig the answer as only one img tag
                        done();
                    });
                    n1.receive({payload:data,topic: "bar"});
                });
            });
        });

        it('should not reuse message', function(done) {
            fs.readFile(file, 'utf8', function(err, data) {
                var flow = [{id:"n1",type:"html",wires:[["n2"]],tag:"ul",ret:"text",as:"multi"},
                            {id:"n2", type:"helper"}];

                helper.load(htmlNode, flow, function() {
                    var n1 = helper.getNode("n1");
                    var n2 = helper.getNode("n2");
                    var prev_msg = undefined;
                    n2.on("input", function(msg) {
                        cnt++;
                        if (prev_msg == undefined) {
                            prev_msg = msg;
                        }
                        else {
                            msg.should.not.equal(prev_msg);
                        }
                        if (cnt == 2) {
                            done();
                        }
                    });
                    n1.receive({payload:data,topic: "bar"});
                });
            });
        });

    });

});
