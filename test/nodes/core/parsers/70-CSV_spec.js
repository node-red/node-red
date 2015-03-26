/**
 * Copyright 2015 IBM Corp.
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
var csvNode = require("../../../../nodes/core/parsers/70-CSV.js");
var helper = require("../../helper.js");

describe('CSV node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded with defaults', function(done) {
        var flow = [{id:"csvNode1", type:"csv", name: "csvNode" }];
        helper.load(csvNode, flow, function() {
            var n1 = helper.getNode("csvNode1");
            n1.should.have.property('name', 'csvNode');
            n1.should.have.property('template', [ '' ]);
            n1.should.have.property('sep', ',');
            n1.should.have.property('quo', '"');
            n1.should.have.property('ret', '\n');
            n1.should.have.property('winflag', false);
            n1.should.have.property('lineend', '\n');
            n1.should.have.property('multi', 'one');
            n1.should.have.property('hdrin', false);
            done();
        });
    });

    describe('csv to json', function() {

        it('should convert a simple csv string to a javascript object', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload',  { a: 1, b: 2, c: 3, d: 4 });
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should remove quotes and whitespace from template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:'"a",  "b" , " c "," d  " ', wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload',  { a: 1, b: 2, c: 3, d: 4 });
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should create column names if no template provided', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:'', wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload',  { col1: 1, col2: 2, col3: 3, col4: 4 });
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow dropping of fields from the template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,,,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload',  { a: 1, d: 4 });
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });


        it('should allow quotes in the input', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 1, b: -2, c: '+3', d: 4, e: -5, f: 'ab"cd', g: 'with,a,comma' });
                    done();
                });
                var testString = '"1","-2","+3","04","-05",ab""cd,"with,a,comma"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should be able to use the first line as a template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", hdrin:true, wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    //console.log(msg);
                    if (c === 0) {
                        msg.should.have.property('payload',  { w: 1, x: 2, y: 3, z: 4 });
                        c += 1;
                    }
                    else  {
                        msg.should.have.property('payload',  { w: 5, x: 6, y: 7, z: 8 });
                        done();
                    }
                });
                var testString = "w,x,y,z\n1,2,3,4\n\n5,6,7,8";
                n1.emit("input", {payload:testString});
            });
        });

        it('should be able to output multiple lines as one array', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", multi:"yes", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    //console.log(msg);
                    msg.should.have.property('payload',  [ { a: 1, b: 2, c: 3, d: 4 },{ a: 5, b: -6, c: 7, d: '+8' },{ a: 9, b: 0, c: 'a', d: 'b' },{ a: 'c', b: 'd', c: 'e', d: 'f' } ]);
                    done();
                });
                var testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                n1.emit("input", {payload:testString});
            });
        });
    });

    describe('json object to csv', function() {

        it('should convert a simple object back to a csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '4,3,2,1\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { d: 1, b: 3, c: 2, a: 4 };
                n1.emit("input", {payload:testJson});
            });
        });

        it('should be able to include column names as first row', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", hdrout:true, ret:"\r\n", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'a,b,c,d\r\n4,3,2,1\r\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d: 1, b: 3, c: 2, a: 4 }];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should handle quotes and sub-properties', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '{},"text,with,commas","This ""is"" a banana","{""sub"":""object""}"\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { d: {sub:"object"}, b: "text,with,commas", c: 'This "is" a banana', a: {sub2:undefined} };
                n1.emit("input", {payload:testJson});
            });
        });

    });

    it('should just pass through if no payload provided', function(done) {
        var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
        helper.load(csvNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('topic', { a: 4, b: 3, c: 2, d: 1 });
                        msg.should.not.have.property('payload');

                        done();
                    }
                    catch(e) { done(e); }
                });
            var testJson = { d: 1, b: 3, c: 2, a: 4 };
            n1.emit("input", {topic:testJson});
        });
    });

    it('should warn if provided a number or boolean', function(done) {
        var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
        helper.load(csvNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                try {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "csv";
                    });
                    logEvents.should.have.length(2);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.toString().should.startWith('This node only handles csv strings or js objects.');
                    logEvents[1][0].should.have.a.property('msg');
                    logEvents[1][0].msg.toString().should.startWith('This node only handles csv strings or js objects.');
                    done();
                } catch(err) {
                    done(err);
                }
            },150);
            n1.emit("input", {payload:1});
            n1.emit("input", {payload:true});
        });
    });

});
