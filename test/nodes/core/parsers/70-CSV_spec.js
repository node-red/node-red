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
var csvNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-CSV.js");
var helper = require("node-red-node-test-helper");

describe('CSV node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
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
        var parts_id = undefined;

        afterEach(function() {
            parts_id = undefined;
        });

        function check_parts(msg, index, count) {
            msg.should.have.property('parts');
            if(parts_id === undefined) {
                parts_id = msg.parts.id;
            }
            else {
                msg.parts.should.have.property('id', parts_id);
            }
            msg.parts.should.have.property('index', index);
            msg.parts.should.have.property('count', count);
        }

        it('should convert a simple csv string to a javascript object', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                    check_parts(msg, 0, 1);
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
                    msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                    check_parts(msg, 0, 1);
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
                    msg.should.have.property('payload', { col1: 1, col2: 2, col3: 3, col4: 4 });
                    check_parts(msg, 0, 1);
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
                    msg.should.have.property('payload', { a: 1, d: 4 });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should leave numbers starting with 0, e and + as strings (except 0.)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 123, b: "0123", c: '+123', d: 'e123', e: 'E123', f: -123 });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = '123,0123,+123,e123,E123,-123'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should not parse numbers when told not to do so', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", strings:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: "1.23", b: "0123", c: "+123", d: "e123", e: "0", f: "-123", g: "1e3" });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = '1.23,0123,+123,e123,0,-123,1e3'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should leave handle strings with scientific notation as numbers', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 12000, b: 0.012, c: -12000, d: -0.012 });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = '12E3,12e-3,-12e3,-12E-3'+String.fromCharCode(10);
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
                    //console.log(msg);
                    msg.should.have.property('payload', { a: 1, b: -2, c: '+3', d: '04', e: '-05', f: 'ab"cd', g: 'with,a,comma' });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = '"1","-2","+3","04","-05","ab""cd","with,a,comma"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should recover from an odd number of quotes in the input', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    //console.log(msg);
                    msg.should.have.property('payload', { a: "with,an", b: "odd,number", c: "ofquotes" });
                    //msg.should.have.property('payload', { a: 1, b: -2, c: '+3', d: 4, e: -5, f: 'ab"cd', g: 'with,a,comma' });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = '"with,a"n,odd","num"ber","of"qu"ot"es"'+String.fromCharCode(10);
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
                        msg.should.have.property('payload', { w: 1, x: 2, y: 3, z: 4 });
                        check_parts(msg, 0, 2);
                        c += 1;
                    }
                    else {
                        msg.should.have.property('payload', { w: 5, x: 6, y: 7, z: 8 });
                        check_parts(msg, 1, 2);
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
                    msg.should.have.property('payload', [ { a: 1, b: 2, c: 3, d: 4 },{ a: 5, b: -6, c: '07', d: '+8' },{ a: 9, b: 0, c: 'a', d: 'b' },{ a: 'c', b: 'd', c: 'e', d: 'f' } ]);
                    msg.should.not.have.property('parts');
                    done();
                });
                var testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                n1.emit("input", {payload:testString});
            });
        });

        it('should handle numbers in strings but not IP addresses', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: "a", b: "127.0.0.1", c: 56.7, d: -32.8, e: "+76.22C" });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = "a,127.0.0.1,56.7,-32.8,+76.22C";
                n1.emit("input", {payload:testString});
            });
        });

        it('should preserve parts property', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                    check_parts(msg, 3, 4);
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString, parts: {id:"X", index:3, count:4} });
            });
        });

        it('should be able to use the first of multiple parts as a template if parts are present', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    if (c === 0) {
                        msg.should.have.property('payload', { w: 1, x: 2, y: 3, z: 4 });
                        check_parts(msg, 0, 2);
                        c += 1;
                    }
                    else {
                        msg.should.have.property('payload', { w: 5, x: 6, y: 7, z: 8 });
                        check_parts(msg, 1, 2);
                        done();
                    }
                });
                var testString1 = "w,x,y,z\n";
                var testString2 = "1,2,3,4\n";
                var testString3 = "5,6,7,8\n";
                n1.emit("input", {payload:testString1, parts:{id:"X", index:0, count:3}});
                n1.emit("input", {payload:testString2, parts:{id:"X", index:1, count:3}});
                n1.emit("input", {payload:testString3, parts:{id:"X", index:2, count:3}});
            });
        });

        it('should skip several lines from start if requested', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", skip: 2, wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { a: 9, b: 0, c: "A", d: "B" });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10)+"5,6,7,8"+String.fromCharCode(10)+"9,0,A,B"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should skip several lines from start then use next line as a tempate', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", hdrin:true, skip: 2, wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload', { "9": "C", "0": "D", "A": "E", "B": "F" });
                    check_parts(msg, 0, 1);
                    done();
                });
                var testString = "1,2,3,4"+String.fromCharCode(10)+"5,6,7,8"+String.fromCharCode(10)+"9,0,A,B"+String.fromCharCode(10)+"C,D,E,F"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should skip several lines from start and correct parts', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", skip: 2, wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    if (c===0) {
                        msg.should.have.property('payload', { a: 9, b: 0, c: "A", d: "B" });
                        check_parts(msg, 0, 2);
                        c = c+1;
                    }
                    else {
                        msg.should.have.property('payload', { a: "C", b: "D", c: "E", d: "F" });
                        check_parts(msg, 1, 2);
                        done();
                    }
                });
                var testString = "1,2,3,4"+String.fromCharCode(10)+"5,6,7,8"+String.fromCharCode(10)+"9,0,A,B"+String.fromCharCode(10)+"C,D,E,F"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should be able to skip and then use the first of multiple parts as a template if parts are present', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, skip:2, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    if (c === 0) {
                        msg.should.have.property('payload', { w: 1, x: 2, y: 3, z: 4 });
                        check_parts(msg, 0, 2);
                        c += 1;
                    }
                    else {
                        msg.should.have.property('payload', { w: 5, x: 6, y: 7, z: 8 });
                        check_parts(msg, 1, 2);
                        done();
                    }
                });
                var testStringA = "foo\n";
                var testStringB = "bar\n";
                var testString1 = "w,x,y,z\n";
                var testString2 = "1,2,3,4\n";
                var testString3 = "5,6,7,8\n";
                n1.emit("input", {payload:testStringA, parts:{id:"X", index:0, count:5}});
                n1.emit("input", {payload:testStringB, parts:{id:"X", index:1, count:5}});
                n1.emit("input", {payload:testString1, parts:{id:"X", index:2, count:5}});
                n1.emit("input", {payload:testString2, parts:{id:"X", index:3, count:5}});
                n1.emit("input", {payload:testString3, parts:{id:"X", index:4, count:5}});
            });
        });

    });

    describe('json object to csv', function() {

        it('should convert a simple object back to a csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,,e", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '4,foo,true,,0\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { e:0, d:1, b:"foo", c:true, a:4 };
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert a simple object back to a csv with no template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:" ", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '1,foo,"ba""r","di,ng"\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { d:1, b:"foo", c:"ba\"r", a:"di,ng" };
                n1.emit("input", {payload:testJson});
            });
        });

        it('should handle a template with spaces in the property names', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b o,c p,,e", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '4,foo,true,,0\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { e:0, d:1, "b o":"foo", "c p":true, a:4 };
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of objects to a multi-line csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '4,3,2,1\n1,2,3,4\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d: 1, b: 3, c: 2, a: 4 },{d:4,a:1,c:3,b:2}];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert a simple array back to a csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', ',0,1,foo,"ba""r","di,ng"\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = ["",0,1,"foo",'ba"r','di,ng'];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of arrays back to a multi-line csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[["n2"]] },
                    {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '0,1,2,3,4\n4,3,2,1,0\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [[0,1,2,3,4],[4,3,2,1,0]];
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
                    logEvents[0][0].msg.toString().should.startWith('csv.errors.csv_js');
                    logEvents[1][0].should.have.a.property('msg');
                    logEvents[1][0].msg.toString().should.startWith('csv.errors.csv_js');
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
