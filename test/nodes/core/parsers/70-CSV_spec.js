/* eslint-disable no-undef */
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

// const should = require("should");
const csvNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-CSV.js");
const statusNode = require("nr-test-utils").require("@node-red/nodes/core/common/25-status.js");
const functionNode = require("nr-test-utils").require("@node-red/nodes/core/function/10-function.js");
const delayNode = require("nr-test-utils").require("@node-red/nodes/core/function/89-delay.js");
const helper = require("node-red-node-test-helper");
// const { neq } = require("semver");

describe('CSV node (Legacy Mode)', function() {

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
            try {
                n1.should.have.property('name', 'csvNode');
                n1.should.have.property('template','');
                n1.should.have.property('sep', ',');
                n1.should.have.property('quo', '"');
                n1.should.have.property('ret', '\n');
                // n1.should.have.property('winflag', false);
                // n1.should.have.property('lineend', '\n');
                n1.should.have.property('multi', 'one');
                n1.should.have.property('hdrin', false);
                done();
            } catch (error) {
                done(error);
            }
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
                    try {
                        msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                        msg.should.have.property('columns', "a,b,c,d");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should convert a simple string to a javascript object with | separator (no template)', function(done) {
            var flow = [ { id:"n1", type:"csv", sep:"|", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { col1: 1, col2: 2, col3: 3, col4: 4 });
                        msg.should.have.property('columns', "col1,col2,col3,col4");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1|2|3|4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should convert a simple string to a javascript object with tab separator (with template)', function(done) {
            var flow = [ { id:"n1", type:"csv", sep:"\t", temp:"A,B,,D", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { A: 1, B: 2, D: 4 });
                        msg.should.have.property('columns', "A,B,D");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1\t2\t3\t4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should convert a simple string to a javascript object with space separator (with spaced template)', function(done) {
            var flow = [ { id:"n1", type:"csv", sep:" ", temp:"A, B, , D", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { A: 1, B: 2, D: 4 });
                        msg.should.have.property('columns', "A,B,D");
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = "1 2 3 4"+String.fromCharCode(10);
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
                    try {
                        msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', { col1: 1, col2: 2, col3: 3, col4: 4 });
                        msg.should.have.property('columns', "col1,col2,col3,col4");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', { a: 1, d: 4 });
                        msg.should.have.property('columns', 'a,d');
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow commas and spaces in the template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b b,\"c,c\",\" d, d \"", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b":2, "c,c":3, "d, d": 4 });
                        msg.should.have.property('columns', 'a,b b,"c,c","d, d"');
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = "1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow passing in a template as first line of CSV', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b":2, "c,c":3, "d, d": 4 });
                        msg.should.have.property('columns', 'a,b b,"c,c","d, d"');
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = 'a,b b,"c,c"," d, d "'+"\n"+"1,2,3,4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow passing in a template as first line of CSV (not comma)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, sep:";", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b":2, "c;c":3, "d, d": 4 });
                        msg.should.have.property('columns', 'a,b b,c;c,"d, d"');
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = 'a;b b;"c;c";" d, d "'+"\n"+"1;2;3;4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow passing in a template as first line of CSV (special char /)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, sep:"/", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b":2, "c/c":3, "d, d": 4 });
                        msg.should.have.property('columns', 'a,b b,c/c,"d, d"');
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = 'a/b b/"c/c"/" d, d "'+"\n"+"1/2/3/4"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow passing in a template as first line of CSV (special char \\)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, sep:"\\", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b":2, "c\\c":3, "d, d": 4 });
                        msg.should.have.property('columns', 'a,b b,c\\c,"d, d"');
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                var testString = 'a\\b b\\"c\\c"\\" d, d "'+"\n"+"1\\2\\3\\4"+String.fromCharCode(10);
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
                    try {
                        msg.should.have.property('payload', { a: 123, b: "0123", c: '+123', d: 'e123', e: 'E123', f: -123 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', { a: "1.23", b: "0123", c: "+123", d: "e123", e: "0", f: "-123", g: "1e3" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = '1.23,0123,+123,e123,0,-123,1e3'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should parse numbers when told to do so', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: 1.23, b: -123, c: 1000, d: 0 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = ' 1.23 ,  -123,1e3 ,    0  '+String.fromCharCode(10);
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
                    try {
                        msg.should.have.property('payload', { a: 12000, b: 0.012, c: -12000, d: -0.012 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = '12E3,12e-3,-12e3,-12E-3'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });


        it('should allow quotes in the input (but drop blank strings)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g,h", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a:1, b:-2, c:'+3', d:'04', f:'-05', g:'ab"cd', h:'with,a,comma' });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = '"1","-2","+3","04","","-05","ab""cd","with,a,comma"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow blank strings in the input if selected', async function() {
            const flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", include_empty_strings:true, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            await helper.load(csvNode, flow) 
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            await new Promise((resolve, reject) => {
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, b: '', c: '', d: '', e: '-05', f: 'ab"cd', g: 'with,a,comma' });
                        //check_parts(msg, 0, 1);
                        resolve()
                    } catch (err) {
                        reject(err);
                    }
                });
                const testString = '"1","","","","-05","ab""cd","with,a,comma"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should allow missing columns (nulls) in the input if selected', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", include_null_values:true, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a: 1, b: null, c: '+3', d: null, e: '-05', f: 'ab"cd', g: 'with,a,comma' });
                        // check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = '"1",,"+3",,"-05","ab""cd","with,a,comma"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should handle cr and lf in the input', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a: "with a\nnew line", b: "and a\rcarriage return", c: "and why\r\nnot both"});
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = '"with a'+String.fromCharCode(10)+'new line","and a'+String.fromCharCode(13)+'carriage return","and why\r\nnot both"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should recover from an odd number of quotes in the input', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    try {
                        if (c == 0) {
                            c = 1;
                            msg.should.have.property('payload', { a: "with,an", b: "odd,number", c: "ofquotes\n" });
                            check_parts(msg, 0, 1);
                        }
                        else {
                            msg.should.have.property('payload', { a: "this is", b: "a normal", c: "line" });
                            check_parts(msg, 0, 1);
                            done();
                        }
                    }
                    catch(e) { done(e); }
                });
                var testString = '"with,a"n,odd","num"ber","of"qu"ot"es"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
                n1.emit("input", {payload:'"this is","a normal","line"'});
            });
        });

        it('should recover from an odd number of quotes in the input (2)', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e,f,g", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    try {
                        //console.log(msg)
                        if (c == 0) {
                            c = 1;
                            msg.should.have.property('payload', { a: "with,an", b: "odd,number", c: "ofquotes\nthis is,a normal,line\n" });
                            check_parts(msg, 0, 1);
                        }
                        else {
                            msg.should.have.property('payload', { a: "this is", b: "another", c: "line" });
                            check_parts(msg, 0, 1);
                            done();
                        }
                    }
                    catch(e) { done(e); }
                });
                var testString = '"with,a"n,odd","num"ber","of"qu"ot"es"'+String.fromCharCode(10)+'"this is","a normal","line"'+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
                n1.emit("input", {payload:'"this is","another","line"'});
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
                    try {
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
                    }
                    catch(e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', [ { a: 1, b: 2, c: 3, d: 4 },{ a: 5, b: -6, c: '07', d: '+8' },{ a: 9, b: 0, c: 'a', d: 'b' },{ a: 'c', b: 'd', c: 'e', d: 'f' } ]);
                        msg.should.have.property('columns','a,b,c,d');
                        msg.should.not.have.property('parts');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                n1.emit("input", {payload:testString});
            });
        });

        it('should be able to create an array from multiple parts', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, multi:"mult", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', [{"a":1,"b":2,"c":3},{"a":4,"b":5,"c":6},{"a":7,"b":8,"c":9}]);
                        msg.should.have.property('columns','a,b,c');
                        msg.should.not.have.property('parts');
                        done();
                    }
                    catch(e) { done(e); }
                });

                n1.emit("input", {"payload":"a,b,c","parts":{"index":0,"ch":"\n","type":"string","id":"1"}});
                n1.emit("input", {"payload":"1,2,3","parts":{"index":1,"ch":"\n","type":"string","id":"1"}});
                n1.emit("input", {"payload":"4,5,6","parts":{"index":2,"ch":"\n","type":"string","id":"1"}});
                n1.emit("input", {"payload":"7,8,9","parts":{"index":3,count:4,"ch":"\n","type":"string","id":"1"}});
            });
        });

        it('should be able to output multiple objects as an array from an input of parts', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrin:true, multi:"yes", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', [{"Col1":"V1","Col2":"V2"},{"Col1":"V3","Col2":"V4"},{"Col1":"V5","Col2":"V6"}]);
                        msg.should.have.property('columns','Col1,Col2');
                        msg.should.have.property('parts');
                        done();
                    }
                    catch(e) { done(e); }
                });
                //var testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                // n1.emit("input", {payload:testString});
                n1.emit("input", {"payload":"Col1,Col2\nV1,V2\nV3,V4\nV5,V6","topic":"","parts":{"id":"3af07e18.865652","type":"array","count":2,"len":1,"index":0}});
                //n1.emit("input", {"payload":"Var1,Var2\nW1,W2\nW3,W4\nW5,W6","topic":"","parts":{"id":"3af07e18.865652","type":"array","count":2,"len":1,"index":1}});
            });
        });

        it('should handle numbers in strings but not IP addresses', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d,e", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { a: "a", b: "127.0.0.1", c: 56.7, d: -32.8, e: "+76.22C" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                        check_parts(msg, 3, 4);
                        done();
                    }
                    catch(e) { done(e); }
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
                    try {
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
                    }
                    catch(e) { done(e); }
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
                    try {
                        msg.should.have.property('payload', { a: 9, b: 0, c: "A", d: "B" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testString = "1,2,3,4"+String.fromCharCode(10)+"5,6,7,8"+String.fromCharCode(10)+"9,0,A,B"+String.fromCharCode(10);
                n1.emit("input", {payload:testString});
            });
        });

        it('should skip several lines from start then use next line as a template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", hdrin:true, skip: 2, wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', { "9": "C", "0": "D", "A": "E", "B": "F" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch(e) { done(e); }
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
                    try {
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
                    }
                    catch(e) { done(e); }
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
                    try {
                        if (c === 0) {
                            msg.should.have.property('payload', { w: 1, x: 2, y: 3, z: 4 });
                            msg.should.have.property('columns', 'w,x,y,z');
                            check_parts(msg, 0, 2);
                            c += 1;
                        }
                        else {
                            msg.should.have.property('payload', { w: 5, x: 6, y: 7, z: 8 });
                            msg.should.have.property('columns', 'w,x,y,z');
                            check_parts(msg, 1, 2);
                            done();
                        }
                    }
                    catch(e) { done(e); }
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
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,,e,f,g,h,i,j,k", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    // console.log("GOT",msg)
                    try {
                        msg.should.have.property('payload', '4,foo,true,,0,"Hello\nWorld",,,undefined,null,null\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { e:0, d:1, b:"foo", c:true, a:4, f:"Hello\nWorld", h:undefined, i:"undefined",j:null,k:"null" };
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
                    // console.log("GOT",msg)
                    try {
                        msg.should.have.property('payload', '1,foo,"ba""r","di,ng",,undefined,null\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = { d:1, b:"foo", c:"ba\"r", a:"di,ng", e:undefined, f:"undefined", g:null,h:"null" };
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert a simple object back to a tsv using a tab as a separator', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", sep:"\t", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '1\tfoo\t"ba""r"\tdi,ng\n');
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

        it('should handle a template with quotes in the property names', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrout:"all", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'a"a,b\'b\nA1,B1\nA2,B2\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [
                    {
                        "a\"a": "A1",
                        "b'b": "B1"
                    },
                    {
                        "a\"a": "A2",
                        "b'b": "B2"
                    }
                ]
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of objects to a multi-line csv', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,d,c,b", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '4,1,2,3\n1,4,3,2\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d:1, b:3, c:2, a:4 },{d:4, a:1, c:3, b:2}];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of objects to a multi-line csv and add a header', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", hdrout:"all", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'a,b,c,d\n4,3,2,1\n1,2,3,"a\nb"\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d:1, b:3, c:2, a:4 },{d:"a\nb", a:1, c:3, b:2}];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of objects to a multi-line csv without a template', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', '1,3,2,4\n4,2,3,1\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d: 1, b: 3, c: 2, a: 4 },{d:4,a:1,c:3,b:2}];
                n1.emit("input", {payload:testJson});
            });
        });

        it('should convert an array of objects to a multi-line csv without a template and with a header', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrout:"all", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'd,b,c,a\n1,3,2,4\n4,"f\ng",3,1\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d: 1, b: 3, c: 2, a: 4 },{d:4,a:1,c:3,b:"f\ng"}];
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
                        msg.should.have.property('payload', ',0,1,foo,"ba""r","di,ng","fa\nba"\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = ["",0,1,"foo",'ba"r','di,ng',"fa\nba"];
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

        it('should be able to include column names as first row, and missing properties', function(done) {
            var flow = [ { id:"n1", type:"csv", hdrout:true, ret:"\r\n", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'col1,col2,col3,col4\r\nH1,H2,H3,H4\r\nA,B,,\r\nA,,C,\r\nA,,,"D\nE"\r\n');
                        done();
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{"col1":"H1","col2":"H2","col3":"H3","col4":"H4"},{"col1":"A","col2":"B"},{"col1":"A","col3":"C"},{"col1":"A","col4":"D\nE"}];
                n1.emit("input", {payload:testJson});
            });
        });


        it('should be able to pass in column names', function(done) {
            var flow = [ { id:"n1", type:"csv", temp:"", hdrout:"once", ret:"\r\n", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                var count = 0;
                n2.on("input", function(msg) {
                    count += 1;
                    try {
                        if (count === 1) {
                            msg.should.have.property('payload', 'a,,b,a\r\n4,,3,4\r\n');
                        }
                        if (count === 3) {
                            msg.should.have.property('payload', '4,,3,4\r\n');
                            done()
                        }
                    }
                    catch(e) { done(e); }
                });
                var testJson = [{ d: 1, b: 3, c: 2, a: 4 }];
                n1.emit("input", {payload:testJson, columns:"a,,b,a", parts:{index:0}});
                n1.emit("input", {payload:testJson, parts:{index:1}});
                n1.emit("input", {payload:testJson, parts:{index:2}});
            });
        });

        it('should be able to pass in column names - with payload as an array', function(done) {
            var flow = [ { id:"n1", type:"csv", hdrout:"once", ret:"\r\n", wires:[["n2"]] },
                {id:"n2", type:"helper"} ];
            helper.load(csvNode, flow, function() {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload', 'a,,b,a\r\n4,,3,4\r\n4,,3,4\r\n4,,3,4\r\n');
                        done()
                    }
                    catch(e) { done(e); }
                });
                var testJson = { d: 1, b: 3, c: 2, a: 4 };
                n1.emit("input", {payload:[testJson,testJson,testJson], columns:"a,,b,a"});
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

    it('should call done when message processing is completed', function(done) {
        const completeNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
        const flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[[]]},
            { id:"c1", type:"complete", scope: ["n1"], uncaught:false, wires:[["h1"]]},
            { id:"h1", type:"helper", wires:[[]]} ];
        helper.load([csvNode,completeNode], flow, function() {
            const n1 = helper.getNode("n1");
            const h1 = helper.getNode("h1");
            h1.on("input", function(msg) {
                try {
                    msg.should.have.a.property('payload', "1,2,3,4");
                    done();
                } catch (e) {
                    done(e);
                }
            });
            n1.receive({payload:"1,2,3,4"});
        });
    });

    it('should call done when input causes an error', function(done) {
        const completeNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
        const flow = [ { id:"n1", type:"csv", temp:"a,b,c,d", wires:[[]]},
            { id:"c1", type:"complete", scope: ["n1"], uncaught:false, wires:[["h1"]]},
            { id:"h1", type:"helper", wires:[[]]} ];
        helper.load([csvNode,completeNode], flow, function() {
            const n1 = helper.getNode("n1");
            const h1 = helper.getNode("h1");
            h1.on("input", function(msg) {
                try {
                    msg.should.have.a.property('payload', 1);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            n1.receive({payload:1}); // neither object nor string
        });
    });
});

describe('CSV node (RFC Mode)', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it('should be loaded with defaults', function (done) {
        // RFC-Legacy difference
        // In RFC mode, the default line separator is \r\n (RFC4180 Section 2.1)
        // In Legacy mode, the line separator is set to \n
        const flow = [{ id: "n1", type: "csv", spec: "rfc", name: "csvNode" }];
        helper.load(csvNode, flow, function () {
            const n1 = helper.getNode("n1");
            try {
                n1.should.have.property('name', 'csvNode');
                n1.should.have.property('template', '');
                n1.should.have.property('sep', ',');
                n1.should.have.property('quo', '"');
                n1.should.have.property('ret', '\r\n'); // RFC-Legacy difference
                n1.should.have.property('multi', 'one');
                n1.should.have.property('hdrin', false);
                done();
            } catch (error) {
                done(error);
            }
        });
    });

    describe('csv to json', function () {
        let parts_id = undefined;

        afterEach(function () {
            parts_id = undefined;
        });

        function check_parts(msg, index, count) {
            msg.should.have.property('parts');
            if (parts_id === undefined) {
                parts_id = msg.parts.id;
            }
            else {
                msg.parts.should.have.property('id', parts_id);
            }
            msg.parts.should.have.property('index', index);
            msg.parts.should.have.property('count', count);
        }

        it('should convert a simple csv string to a javascript object', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                        msg.should.have.property('columns', "a,b,c,d");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should convert a simple string to a javascript object with | separator (no template)', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", sep: "|", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { col1: 1, col2: 2, col3: 3, col4: 4 });
                        msg.should.have.property('columns', "col1,col2,col3,col4");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1|2|3|4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should convert a simple string to a javascript object with tab separator (with template)', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", sep: "\t", temp: "A,B,,D", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { A: 1, B: 2, D: 4 });
                        msg.should.have.property('columns', "A,B,D");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1\t2\t3\t4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should convert a simple string to a javascript object with space separator (with spaced template)', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            // In legacy mode, the template "A, B, , D" is trimmed to "A,B,D"
            const flow = [{ id: "n1", type: "csv", spec: "rfc", sep: " ", temp: "A, B, , D", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //                       'payload', { A: 1, B: 2, D: 4 } // Legacy
                        msg.should.have.property('payload', { A: 1, ' B': 2, ' ': 3, ' D': 4 }); // RFC
                        //                       'columns', "A,B,D" // Legacy
                        msg.should.have.property('columns', "A, B, , D"); // RFC
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = "1 2 3 4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should not remove quotes and whitespace from template - should set status and send warning', async function () {
            // RFC-vs-Legacy difference
            // In RFC mode, the column template is parsed in strict mode
            // meaning this template is invalid because:
            //   * it encounters a quote in an unquoted field (the "b" in the 2nd column)
            //     * The 2nd column starts with a space but then a single quote is encountered. RFC4180 Section 2.6 
            //       says Fields containing line breaks (CRLF), double quotes, and commas should be enclosed in double-quotes
            //   * it contains a data between the closing quote and separator (4th column starts ok but then has a space after the closing quote)
            //     * Since we adhere to RFC4180 Section 2.4, "Spaces are considered part of a field and should not be ignored"
            //       we must treat the space as part of the data meaning field is not correctly close with a quote
            const flow = [
                { id: "n1", type: "csv", spec: "rfc", temp: '', ret: '\n', wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            await helper.load(csvNode, flow)

            const n1 = helper.getNode("n1")
            const n2 = helper.getNode("n2")

            //modify the flow and deploy change that sets the csv node to a bad template - thus updating the nodes status and logging a warning
            const newConfig = flow.map(n => ({ ...n }));
            newConfig[0].temp = '"a",  "b" , " c "," d  " ';
            await helper.setFlows(newConfig, "nodes") // deploy "nodes" only

            // small sleep for msg flow and logging to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // check that status message was sent
            n1.status.called.should.be.true();
            n1.status.lastCall.args[0].should.deepEqual({ fill: 'red', shape: 'dot', text: 'csv.errors.bad_template' });

            // warn message should be logged
            n1.warn.called.should.be.true();
            n1.warn.lastCall.args[0].should.equal('csv.errors.bad_template');
            const logs = helper.log().args.filter(function (evt) {
                return evt[0].type == "csv";
            });
            logs.should.have.length(1);
            logs[0][0].should.have.a.property('msg');
            logs[0][0].msg.should.equal('csv.errors.bad_template');
        });

        it('should create column names if no template provided', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: '', wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { col1: 1, col2: 2, col3: 3, col4: 4 });
                        msg.should.have.property('columns', "col1,col2,col3,col4");
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow dropping of fields from the template', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,,,d", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, d: 4 });
                        msg.should.have.property('columns', 'a,d');
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow commas and spaces in the template', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            // In legacy mode, the template `a,b b,\"c,c\",\" d, d \"` is trimmed to `a,b b,"c,c","d, d"`
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b b,\"c,c\",\" d, d \"", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //                       'payload', { a: 1, "b b":2, "c,c":3, "d, d": 4 } // Legacy
                        msg.should.have.property('payload', { a: 1, "b b": 2, "c,c": 3, " d, d ": 4 }); // RFC-vs-Legacy difference
                        //                       'columns', 'a,b b,"c,c","d, d"' // Legacy
                        msg.should.have.property('columns', 'a,b b,"c,c"," d, d "'); // RFC-vs-Legacy difference
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow passing in a template as first line of CSV', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b": 2, "c,c": 3, " d, d ": 4 }); // RFC-vs-Legacy difference
                        msg.should.have.property('columns', 'a,b b,"c,c"," d, d "'); // RFC-vs-Legacy difference
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = 'a,b b,"c,c"," d, d "' + "\n" + "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow passing in a template as first line of CSV (not comma)', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, sep: ";", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b": 2, "c;c": 3, " d, d ": 4 }); // RFC-vs-Legacy difference
                        msg.should.have.property('columns', 'a,b b,c;c," d, d "'); // RFC-vs-Legacy difference
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = 'a;b b;"c;c";" d, d "' + "\n" + "1;2;3;4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow passing in a template as first line of CSV (special char /)', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, sep: "/", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b": 2, "c/c": 3, " d, d ": 4 }); // RFC-vs-Legacy difference
                        msg.should.have.property('columns', 'a,b b,c/c," d, d "'); // RFC-vs-Legacy difference
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = 'a/b b/"c/c"/" d, d "' + "\n" + "1/2/3/4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow passing in a template as first line of CSV (special char \\)', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, spaces are respected in the template (RFC4180 Section 2.4)
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, sep: "\\", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, "b b": 2, "c\\c": 3, " d, d ": 4 }); // RFC-vs-Legacy difference
                        msg.should.have.property('columns', 'a,b b,c\\c," d, d "'); // RFC-vs-Legacy difference
                        check_parts(msg, 0, 1);
                        done();
                    } catch (e) { done(e); }
                });
                const testString = 'a\\b b\\"c\\c"\\" d, d "' + "\n" + "1\\2\\3\\4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should leave numbers starting with 0, e and + as strings (except 0.)', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 123, b: "0123", c: '+123', d: 'e123', e: 'E123', f: -123 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '123,0123,+123,e123,E123,-123' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should not parse numbers when told not to do so', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", strings: false, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: "1.23", b: "0123", c: "+123", d: "e123", e: "0", f: "-123", g: "1e3" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '1.23,0123,+123,e123,0,-123,1e3' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should parse numbers when told to do so', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1.23, b: -123, c: 1000, d: 0 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = ' 1.23 ,  -123,1e3 ,    0  ' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should leave handle strings with scientific notation as numbers', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 12000, b: 0.012, c: -12000, d: -0.012 });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '12E3,12e-3,-12e3,-12E-3' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });


        it('should allow quotes in the input (but drop blank strings)', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g,h", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a: 1, b: -2, c: '+3', d: '04', f: '-05', g: 'ab"cd', h: 'with,a,comma' });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '"1","-2","+3","04","","-05","ab""cd","with,a,comma"' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow blank strings in the input if selected', async function () {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", include_empty_strings: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            await helper.load(csvNode, flow)
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            await new Promise((resolve, reject) => {
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, b: '', c: '', d: '', e: '-05', f: 'ab"cd', g: 'with,a,comma' });
                        resolve()
                    } catch (err) {
                        reject(err);
                    }
                });
                const testString = '"1","","","","-05","ab""cd","with,a,comma"' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should allow missing columns (nulls) in the input if selected', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", include_null_values: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a: 1, b: null, c: '+3', d: null, e: '-05', f: 'ab"cd', g: 'with,a,comma' });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '"1",,"+3",,"-05","ab""cd","with,a,comma"' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should handle cr and lf in the input', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //console.log(msg);
                        msg.should.have.property('payload', { a: "with a\nnew line", b: "and a\rcarriage return", c: "and why\r\nnot both" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = '"with a' + String.fromCharCode(10) + 'new line","and a' + String.fromCharCode(13) + 'carriage return","and why\r\nnot both"' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should recover from an odd number of quotes in the input', function (done) {
            // RFC-vs-Legacy difference
            // In RFC mode, the column template is parsed in strict mode
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let c = 0;
                n2.on("input", function (msg) {
                    try {
                        if (c == 0) {
                            c = 1;
                            //                       'payload', { a: "with,an", b: "odd,number", c: "ofquotes\n" } // Legacy
                            msg.should.have.property('payload', { a: 'with,a"n', b: 'odd', c: 'num"ber', d: 'of"qu"ot"es' }); // RFC-vs-Legacy difference
                            // the result in this bad input data case as defined in RFC4180 would be to fail the parse (strict mode does this, but we don't enforce it in the data)
                            // However, to better parse _acceptably_ bad data like a,b"b,c'c,"d,d" (which the newer RFC mode parser correctly parses as a,b"b,c'c,"d,d") we would 
                            // need specific code to handle this case and that code would be on the hot path for all data.
                            // This feels like an acceptable trade-off especially as the legacy mode parser is to be kept for backwards compatibility (until we can remove it)
                            check_parts(msg, 0, 1);
                        }
                        else {
                            msg.should.have.property('payload', { a: "this is", b: "a normal", c: "line" });
                            check_parts(msg, 0, 1);
                            done();
                        }
                    }
                    catch (e) { done(e); }
                });
                const testString = '"with,a"n,odd","num"ber","of"qu"ot"es"' + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
                n1.emit("input", { payload: '"this is","a normal","line"' });
            });
        });

        it('should handle newlines in the input data', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e,f,g", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        //console.log(msg)
                        // input => 'ay,be,"c has 2\nnew\nlines",dee,eee,eff,gee'
                        msg.should.have.property('payload', { a: 'ay', b: 'be', c: 'c has 2\nnew\nlines', d: 'dee', e: 'eee', f: 'eff', g: 'gee' });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });

                n1.emit("input", { payload: 'ay,be,"c has 2\nnew\nlines",dee,eee,eff,gee' });
            });
        });

        it('should be able to use the first line as a template', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", hdrin: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let c = 0;
                n2.on("input", function (msg) {
                    try {
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
                    }
                    catch (e) { done(e); }
                });
                const testString = "w,x,y,z\n1,2,3,4\n\n5,6,7,8";
                n1.emit("input", { payload: testString });
            });
        });

        it('should be able to output multiple lines as one array', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", multi: "yes", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', [{ a: 1, b: 2, c: 3, d: 4 }, { a: 5, b: -6, c: '07', d: '+8' }, { a: 9, b: 0, c: 'a', d: 'b' }, { a: 'c', b: 'd', c: 'e', d: 'f' }]);
                        msg.should.have.property('columns', 'a,b,c,d');
                        msg.should.not.have.property('parts');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                n1.emit("input", { payload: testString });
            });
        });

        it('should be able to create an array from multiple parts', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, multi: "mult", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', [{ "a": 1, "b": 2, "c": 3 }, { "a": 4, "b": 5, "c": 6 }, { "a": 7, "b": 8, "c": 9 }]);
                        msg.should.have.property('columns', 'a,b,c');
                        msg.should.not.have.property('parts');
                        done();
                    }
                    catch (e) { done(e); }
                });

                n1.emit("input", { "payload": "a,b,c", "parts": { "index": 0, "ch": "\n", "type": "string", "id": "1" } });
                n1.emit("input", { "payload": "1,2,3", "parts": { "index": 1, "ch": "\n", "type": "string", "id": "1" } });
                n1.emit("input", { "payload": "4,5,6", "parts": { "index": 2, "ch": "\n", "type": "string", "id": "1" } });
                n1.emit("input", { "payload": "7,8,9", "parts": { "index": 3, count: 4, "ch": "\n", "type": "string", "id": "1" } });
            });
        });

        it('should be able to output multiple objects as an array from an input of parts', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, multi: "yes", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', [{ "Col1": "V1", "Col2": "V2" }, { "Col1": "V3", "Col2": "V4" }, { "Col1": "V5", "Col2": "V6" }]);
                        msg.should.have.property('columns', 'Col1,Col2');
                        msg.should.have.property('parts');
                        done();
                    }
                    catch (e) { done(e); }
                });
                //var testString = "1,2,3,4\n5,-6,07,+8\n9,0,a,b\nc,d,e,f";
                // n1.emit("input", {payload:testString});
                n1.emit("input", { "payload": "Col1,Col2\nV1,V2\nV3,V4\nV5,V6", "topic": "", "parts": { "id": "3af07e18.865652", "type": "array", "count": 2, "len": 1, "index": 0 } });
                //n1.emit("input", {"payload":"Var1,Var2\nW1,W2\nW3,W4\nW5,W6","topic":"","parts":{"id":"3af07e18.865652","type":"array","count":2,"len":1,"index":1}});
            });
        });

        it('should handle numbers in strings but not IP addresses', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d,e", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: "a", b: "127.0.0.1", c: 56.7, d: -32.8, e: "+76.22C" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "a,127.0.0.1,56.7,-32.8,+76.22C";
                n1.emit("input", { payload: testString });
            });
        });

        it('should preserve parts property', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 1, b: 2, c: 3, d: 4 });
                        check_parts(msg, 3, 4);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10);
                n1.emit("input", { payload: testString, parts: { id: "X", index: 3, count: 4 } });
            });
        });

        it('should be able to use the first of multiple parts as a template if parts are present', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let c = 0;
                n2.on("input", function (msg) {
                    try {
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
                    }
                    catch (e) { done(e); }
                });
                const testString1 = "w,x,y,z\n";
                const testString2 = "1,2,3,4\n";
                const testString3 = "5,6,7,8\n";
                n1.emit("input", { payload: testString1, parts: { id: "X", index: 0, count: 3 } });
                n1.emit("input", { payload: testString2, parts: { id: "X", index: 1, count: 3 } });
                n1.emit("input", { payload: testString3, parts: { id: "X", index: 2, count: 3 } });
            });
        });

        it('should skip several lines from start if requested', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", skip: 2, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { a: 9, b: 0, c: "A", d: "B" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10) + "5,6,7,8" + String.fromCharCode(10) + "9,0,A,B" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should skip several lines from start then use next line as a template', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", hdrin: true, skip: 2, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', { "9": "C", "0": "D", "A": "E", "B": "F" });
                        check_parts(msg, 0, 1);
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10) + "5,6,7,8" + String.fromCharCode(10) + "9,0,A,B" + String.fromCharCode(10) + "C,D,E,F" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should skip several lines from start and correct parts', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", skip: 2, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let c = 0;
                n2.on("input", function (msg) {
                    try {
                        if (c === 0) {
                            msg.should.have.property('payload', { a: 9, b: 0, c: "A", d: "B" });
                            check_parts(msg, 0, 2);
                            c = c + 1;
                        }
                        else {
                            msg.should.have.property('payload', { a: "C", b: "D", c: "E", d: "F" });
                            check_parts(msg, 1, 2);
                            done();
                        }
                    }
                    catch (e) { done(e); }
                });
                const testString = "1,2,3,4" + String.fromCharCode(10) + "5,6,7,8" + String.fromCharCode(10) + "9,0,A,B" + String.fromCharCode(10) + "C,D,E,F" + String.fromCharCode(10);
                n1.emit("input", { payload: testString });
            });
        });

        it('should be able to skip and then use the first of multiple parts as a template if parts are present', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrin: true, skip: 2, wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let c = 0;
                n2.on("input", function (msg) {
                    try {
                        if (c === 0) {
                            msg.should.have.property('payload', { w: 1, x: 2, y: 3, z: 4 });
                            msg.should.have.property('columns', 'w,x,y,z');
                            check_parts(msg, 0, 2);
                            c += 1;
                        }
                        else {
                            msg.should.have.property('payload', { w: 5, x: 6, y: 7, z: 8 });
                            msg.should.have.property('columns', 'w,x,y,z');
                            check_parts(msg, 1, 2);
                            done();
                        }
                    }
                    catch (e) { done(e); }
                });
                const testStringA = "foo\n";
                const testStringB = "bar\n";
                const testString1 = "w,x,y,z\n";
                const testString2 = "1,2,3,4\n";
                const testString3 = "5,6,7,8\n";
                n1.emit("input", { payload: testStringA, parts: { id: "X", index: 0, count: 5 } });
                n1.emit("input", { payload: testStringB, parts: { id: "X", index: 1, count: 5 } });
                n1.emit("input", { payload: testString1, parts: { id: "X", index: 2, count: 5 } });
                n1.emit("input", { payload: testString2, parts: { id: "X", index: 3, count: 5 } });
                n1.emit("input", { payload: testString3, parts: { id: "X", index: 4, count: 5 } });
            });
        });

    });

    describe('json object to csv', function () {

        it('should convert a simple object back to a csv', function (done) {
            // RFC-vs-Legacy difference
            // By default, the legacy mode parser will use \n as the line separator
            // The RFC mode parser will use \r\n as the line separator as per RFC4180 Section 2.1
            // This is configurable in both modes meaning that the legacy mode parser can be made to use \r\n and the RFC mode parser can be made to use \n
            // Any existing flows will still use the line ending that they were created with as it will be stored in the flow file
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,,e,f,g,h,i,j,k", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    // console.log("GOT",msg)
                    try {
                        //                       'payload', '4,foo,true,,0,"Hello\nWorld",,,undefined,null,null\n'); // Legacy
                        msg.should.have.property('payload', '4,foo,true,,0,"Hello\nWorld",,,undefined,null,null\r\n'); // RFC-vs-Legacy difference
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = { e: 0, d: 1, b: "foo", c: true, a: 4, f: "Hello\nWorld", h: undefined, i: "undefined", j: null, k: "null" };
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert a simple object back to a csv with no template', function (done) {
            // RFC-vs-Legacy differences
            // line separator handling:
            //   By default, the legacy mode parser will use \n as the line separator
            //   The RFC mode parser will use \r\n as the line separator as per RFC4180 Section 2.1
            // spaces:
            //   By default, the legacy mode parser will trim spaces from the start and end template columns
            //   The RFC mode parser will not trim spaces from the start and end template columns (RFC4180 Section 2.4)
            //   This means the original test flow, when ran in RFC mode, was expecting to find a prop name of " " in the input data object
            // To make this test work, we need to change the column template to not be a space!

            //  flow = [ { id:"n1", type:"csv", spec: "rfc", temp:" ", wires:[["n2"]] }, // Legacy
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", wires: [["n2"]] },  // RFC-vs-Legacy difference - legacy mode trims spaces, RFC mode respects them.
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    // console.log("GOT",msg)
                    try {
                        msg.should.have.property('payload', '1,foo,"ba""r","di,ng",,undefined,null\r\n');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = { d: 1, b: "foo", c: "ba\"r", a: "di,ng", e: undefined, f: "undefined", g: null, h: "null" };
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert a simple object back to a tsv using a tab as a separator', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", sep: "\t", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '1\tfoo\t"ba""r"\tdi,ng\n');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = { d: 1, b: "foo", c: "ba\"r", a: "di,ng" };
                n1.emit("input", { payload: testJson });
            });
        });

        it('should handle a template with spaces in the property names', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b o,c p,,e", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '4,foo,true,,0\n');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = { e: 0, d: 1, "b o": "foo", "c p": true, a: 4 };
                n1.emit("input", { payload: testJson });
            });
        });

        it('should handle a template with quotes in the property names', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrout: "all", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //                       'payload', 'a"a,b\'b\nA1,B1\nA2,B2\n'); // Legacy
                        msg.should.have.property('payload', '"a""a",b\'b\nA1,B1\nA2,B2\n'); // RFC-vs-Legacy difference - RFC4180 Section 2.6, 2.7 quote handling
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = [
                    {
                        "a\"a": "A1",
                        "b'b": "B1"
                    },
                    {
                        "a\"a": "A2",
                        "b'b": "B2"
                    }
                ]
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert an array of objects to a multi-line csv', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,d,c,b", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '4,1,2,3\n1,4,3,2\n');
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }, { d: 4, a: 1, c: 3, b: 2 }];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert an array of objects to a multi-line csv and add a header', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", hdrout: "all", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', 'a,b,c,d\n4,3,2,1\n1,2,3,"a\nb"\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }, { d: "a\nb", a: 1, c: 3, b: 2 }];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert an array of objects to a multi-line csv without a template', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '1,3,2,4\n4,2,3,1\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }, { d: 4, a: 1, c: 3, b: 2 }];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert an array of objects to a multi-line csv without a template and with a header', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrout: "all", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', 'd,b,c,a\n1,3,2,4\n4,"f\ng",3,1\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }, { d: 4, a: 1, c: 3, b: "f\ng" }];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert a simple array back to a csv', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //                       'payload', ',0,1,foo,"ba""r","di,ng","fa\nba"\n');
                        msg.should.have.property('payload', ',0,1,foo\n'); // RFC-vs-Legacy difference - respect that user has specified a template with 4 columns
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = ["", 0, 1, "foo", 'ba"r', 'di,ng', "fa\nba"];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should convert an array of arrays back to a multi-line csv', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        //                       'payload', '0,1,2,3,4\n4,3,2,1,0\n'); // Legacy
                        msg.should.have.property('payload', '0,1,2,3\n4,3,2,1\n'); // RFC-vs-Legacy difference - respect that user has specified a template with 4 columns
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0]];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should be able to include column names as first row', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", hdrout: true, ret: "\r\n", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', 'a,b,c,d\r\n4,3,2,1\r\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }];
                n1.emit("input", { payload: testJson });
            });
        });

        it('should be able to include column names as first row, and missing properties', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", hdrout: true, ret: "\r\n", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', 'col1,col2,col3,col4\r\nH1,H2,H3,H4\r\nA,B,,\r\nA,,C,\r\nA,,,"D\nE"\r\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ "col1": "H1", "col2": "H2", "col3": "H3", "col4": "H4" }, { "col1": "A", "col2": "B" }, { "col1": "A", "col3": "C" }, { "col1": "A", "col4": "D\nE" }];
                n1.emit("input", { payload: testJson });
            });
        });


        it('should be able to pass in column names', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "", hdrout: "once", ret: "\r\n", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                let count = 0;
                n2.on("input", function (msg) {
                    count += 1;
                    try {
                        if (count === 1) {
                            msg.should.have.property('payload', 'a,,b,a\r\n4,,3,4\r\n');
                        }
                        if (count === 3) {
                            msg.should.have.property('payload', '4,,3,4\r\n');
                            done()
                        }
                    }
                    catch (e) { done(e); }
                });
                const testJson = [{ d: 1, b: 3, c: 2, a: 4 }];
                n1.emit("input", { payload: testJson, columns: "a,,b,a", parts: { index: 0 } });
                n1.emit("input", { payload: testJson, parts: { index: 1 } });
                n1.emit("input", { payload: testJson, parts: { index: 2 } });
            });
        });

        it('should be able to pass in column names - with payload as an array', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", hdrout: "once", ret: "\r\n", wires: [["n2"]] },
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', 'a,,b,a\r\n4,,3,4\r\n4,,3,4\r\n4,,3,4\r\n');
                        done()
                    }
                    catch (e) { done(e); }
                });
                const testJson = { d: 1, b: 3, c: 2, a: 4 };
                n1.emit("input", { payload: [testJson, testJson, testJson], columns: "a,,b,a" });
            });
        });

        it('should handle quotes and sub-properties', function (done) {
            const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", ret: '\n', wires: [["n2"]] }, // RFC-vs-Legacy difference - use line separator \n to satisfy original test
            { id: "n2", type: "helper" }];
            helper.load(csvNode, flow, function () {
                const n1 = helper.getNode("n1");
                const n2 = helper.getNode("n2");
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload', '{},"text,with,commas","This ""is"" a banana","{""sub"":""object""}"\n');
                        done();
                    }
                    catch (e) { done(e); }
                });
                const testJson = { d: { sub: "object" }, b: "text,with,commas", c: 'This "is" a banana', a: { sub2: undefined } };
                n1.emit("input", { payload: testJson });
            });
        });

    });

    it('should just pass through if no payload provided', function (done) {
        const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [["n2"]] },
        { id: "n2", type: "helper" }];
        helper.load(csvNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('topic', { a: 4, b: 3, c: 2, d: 1 });
                    msg.should.not.have.property('payload');

                    done();
                }
                catch (e) { done(e); }
            });
            const testJson = { d: 1, b: 3, c: 2, a: 4 };
            n1.emit("input", { topic: testJson });
        });
    });

    it('should warn if provided a number or boolean', function (done) {
        const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [["n2"]] },
        { id: "n2", type: "helper" }];
        helper.load(csvNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            setTimeout(function () {
                try {
                    const logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "csv";
                    });
                    logEvents.should.have.length(2);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.toString().should.endWith('csv.errors.csv_js');
                    logEvents[1][0].should.have.a.property('msg');
                    logEvents[1][0].msg.toString().should.endWith('csv.errors.csv_js');
                    done();
                } catch (err) {
                    done(err);
                }
            }, 150);
            n1.emit("input", { payload: 1 });
            n1.emit("input", { payload: true });
        });
    });

    it('should call done when message processing is completed', function (done) {
        const completeNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
        const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [[]] },
        { id: "c1", type: "complete", scope: ["n1"], uncaught: false, wires: [["h1"]] },
        { id: "h1", type: "helper", wires: [[]] }];
        helper.load([csvNode, completeNode], flow, function () {
            const n1 = helper.getNode("n1");
            const h1 = helper.getNode("h1");
            h1.on("input", function (msg) {
                try {
                    msg.should.have.a.property('payload', "1,2,3,4");
                    done();
                } catch (e) {
                    done(e);
                }
            });
            n1.receive({ payload: "1,2,3,4" });
        });
    });

    it('should not call done or pass the bad msg through when input causes an error - should throw error and set status', function (done) {
        // RFC-vs-Legacy difference
        // In RFC mode, instead of passing the bad data through, the node will throw an error and set the status to indicate the error
        const completeNode = require("nr-test-utils").require("@node-red/nodes/core/common/24-complete.js");
        const flow = [{ id: "n1", type: "csv", spec: "rfc", temp: "a,b,c,d", wires: [[]] },
        { id: "c1", type: "complete", scope: ["n1"], uncaught: false, wires: [["h1"]] },
        { id: "h1", type: "helper", wires: [[]] }];
        helper.load([csvNode, completeNode], flow, function () {
            const n1 = helper.getNode("n1");
            const h1 = helper.getNode("h1");
            const c1 = helper.getNode("c1");
            n1.receive({ payload: 1 }); // neither object nor string
            setTimeout(function () {
                try {
                    c1.send.should.not.be.called();
                    const logEvents = helper.log().args.filter(function (evt) {
                        return evt[0].type == "csv";
                    });
                    logEvents.should.have.length(1);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.should.be.an.Error()
                    logEvents[0][0].msg.toString().should.endWith('csv.errors.csv_js');
                    // check status was set
                    n1.status.called.should.be.true();
                    n1.status.lastCall.args[0].should.have.property('fill', 'red');
                    n1.status.lastCall.args[0].should.have.property('shape', 'dot');
                    n1.status.lastCall.args[0].should.have.property('text', 'csv.errors.csv_js');
                    // check error was thrown
                    n1.error.called.should.be.true();
                    n1.error.lastCall.args[0].should.have.property('message', 'csv.errors.csv_js');
                    done();
                } catch (err) {
                    done(err);
                }
            }, 150);

        });
    });
});
