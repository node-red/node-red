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
var jsonNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-JSON.js");
var helper = require("node-red-node-test-helper");

describe('JSON node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should convert a valid json string to a javascript object', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.payload.should.have.property('employees');
                msg.payload.employees[0].should.have.property('firstName', 'John');
                msg.payload.employees[0].should.have.property('lastName', 'Smith');
                done();
            });
            var jsonString = ' {"employees":[{"firstName":"John", "lastName":"Smith"}]}\r\n ';
            jn1.receive({payload:jsonString,topic: "bar"});
        });
    });

    it('should convert a buffer of a valid json string to a javascript object', function(done) {
        var flow = [{id:"jn1",type:"json",action:"obj",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.payload.should.have.property('employees');
                msg.payload.employees[0].should.have.property('firstName', 'John');
                msg.payload.employees[0].should.have.property('lastName', 'Smith');
                done();
            });
            var jsonString = Buffer.from(' {"employees":[{"firstName":"John", "lastName":"Smith"}]}\r\n ');
            jn1.receive({payload:jsonString,topic: "bar"});
        });
    });

    it('should convert a javascript object to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '{"employees":[{"firstName":"John","lastName":"Smith"}]}');
                done();
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            jn1.receive({payload:obj});
        });
    });

    it('should convert a array to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '[1,2,3]');
                done();
            });
            var obj = [1,2,3];
            jn1.receive({payload:obj});
        });
    });

    it('should convert a boolean to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, 'true');
                done();
            });
            var obj = true;
            jn1.receive({payload:obj});
        });
    });

    it('should convert a json string to a boolean', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, true);
                done();
            });
            var obj = "true";
            jn1.receive({payload:obj});
        });
    });

    it('should convert a number to a json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '2019');
                done();
            });
            var obj = 2019;
            jn1.receive({payload:obj});
        });
    });

    it('should convert a json string to a number', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, 1962);
                done();
            });
            var obj = '1962';
            jn1.receive({payload:obj});
        });
    });

    it('should log an error if asked to parse an invalid json string', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                jn1.receive({payload:'foo',topic: "bar"});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.match(/^Unexpected token (o|'o')/);
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },20);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if asked to parse an invalid json string in a buffer', function(done) {
        var flow = [{id:"jn1",type:"json",action:"obj",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                jn1.receive({payload:Buffer.from('{"name":foo}'),topic: "bar"});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.match(/^Unexpected token (o|'o')/);
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },20);
            } catch(err) {
                done(err);
            }
        });
    });

    // it('should log an error if asked to parse something thats not json or js and not in force object mode', function(done) {
    //     var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
    //                 {id:"jn2", type:"helper"}];
    //     helper.load(jsonNode, flow, function() {
    //         var jn1 = helper.getNode("jn1");
    //         var jn2 = helper.getNode("jn2");
    //         setTimeout(function() {
    //             try {
    //                 var logEvents = helper.log().args.filter(function(evt) {
    //                     return evt[0].type == "json";
    //                 });
    //                 logEvents.should.have.length(1);
    //                 logEvents[0][0].should.have.a.property('msg');
    //                 logEvents[0][0].msg.toString().should.eql('json.errors.dropped');
    //                 done();
    //             } catch(err) {
    //                 done(err);
    //             }
    //         },50);
    //         jn1.receive({payload:Buffer.from("abcd")});
    //     });
    // });

    it('should pass straight through if no payload set', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.not.have.property('payload');
                done();
            });
            jn1.receive({topic: "bar"});
        });
    });

    it('should ensure the result is a json string', function(done) {
        var flow = [{id:"jn1",type:"json",action:"str",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            var count = 0;
            jn2.on("input", function(msg) {
                try {
                    should.equal(msg.payload, '{"employees":[{"firstName":"John","lastName":"Smith"}]}');
                    count++;
                    if (count === 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            jn1.receive({payload:obj,topic: "bar"});
            jn1.receive({payload:JSON.stringify(obj),topic: "bar"});
        });
    });

    it('should ensure the result is a JS Object', function(done) {
        var flow = [{id:"jn1",type:"json",action:"obj",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            var count = 0;
            jn2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'bar');
                    msg.payload.should.have.property('employees');
                    msg.payload.employees[0].should.have.property('firstName', 'John');
                    msg.payload.employees[0].should.have.property('lastName', 'Smith');
                    count++;
                    if (count === 2) {
                        done();
                    }
                } catch(err) {
                    done(err);
                }
            });
            var obj = {employees:[{firstName:"John", lastName:"Smith"}]};
            jn1.receive({payload:obj,topic: "bar"});
            jn1.receive({payload:JSON.stringify(obj),topic: "bar"});
        });
    });

    it('should handle any msg property - receive existing string', function(done) {
        var flow = [{id:"jn1",type:"json",property:"one.two",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                try {
                    msg.should.have.property('topic', 'bar');
                    msg.should.have.property('one');
                    msg.one.should.have.property('two');
                    msg.one.two.should.have.property('employees');
                    msg.one.two.employees[0].should.have.property('firstName', 'John');
                    msg.one.two.employees[0].should.have.property('lastName', 'Smith');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            var jsonString = '{"employees":[{"firstName":"John", "lastName":"Smith"}]}';
            jn1.receive({payload:"",one:{two:jsonString},topic: "bar"});

            var logEvents = helper.log().args.filter(function(evt) {
                return evt[0].type == "json";
            });
        });
    });

    it('should handle any msg property - receive existing obj', function(done) {
        var flow = [{id:"jn1",type:"json",property:"one.two",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                try {
                    should.equal(msg.one.two, '{"employees":[{"firstName":"John","lastName":"Smith"}]}');
                    done();
                } catch(err) {
                    done(err);
                }
            });
            var jsonString = '{"employees":[{"firstName":"John", "lastName":"Smith"}]}';
            jn1.receive({payload:"",one:{two:JSON.parse(jsonString)},topic: "bar"});

            var logEvents = helper.log().args.filter(function(evt) {
                return evt[0].type == "json";
            });
        });
    });

    it('should pass an object if provided a valid JSON string and schema', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload.number, 3);
                should.equal(msg.payload.string, "allo");
                done();
            });
            var jsonString =  '{"number": 3, "string": "allo"}';
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:jsonString, schema:schema});
        });
    });

    it('should pass an object if provided a valid object and schema and action is object', function(done) {
        var flow = [{id:"jn1",type:"json",action:"obj",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload.number, 3);
                should.equal(msg.payload.string, "allo");
                done();
            });
            var obj =  {"number": 3, "string": "allo"};
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:obj, schema:schema});
        });
    });

    it('should pass a string if provided a valid object and schema', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '{"number":3,"string":"allo"}');
                done();
            });
            var obj =  {"number": 3, "string": "allo"};
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:obj, schema:schema});
        });
    });

    it('should pass a string if provided a valid JSON string and schema and action is string', function(done) {
        var flow = [{id:"jn1",type:"json",action:"str",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.payload, '{"number":3,"string":"allo"}');
                done();
            });
            var jsonString =  '{"number":3,"string":"allo"}';
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:jsonString, schema:schema});
        });
    });

    it('should log an error if passed an invalid object and valid schema', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
                var obj =  {"number": "foo", "string": 3};
                jn1.receive({payload:obj, schema:schema});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.startWith("json.errors.schema-error");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if passed an invalid object and valid schema and action is object', function(done) {
        var flow = [{id:"jn1",type:"json",action:"obj",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
                var obj =  {"number": "foo", "string": 3};
                jn1.receive({payload:obj, schema:schema});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.startWith("json.errors.schema-error");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if passed an invalid JSON string and valid schema', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
                var jsonString =  '{"number":"Hello","string":3}';
                jn1.receive({payload:jsonString, schema:schema});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.startWith("json.errors.schema-error");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if passed an invalid JSON string and valid schema and action is string', function(done) {
        var flow = [{id:"jn1",type:"json",action:"str",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
                var jsonString =  '{"number":"Hello","string":3}';
                jn1.receive({payload:jsonString, schema:schema});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.startWith("json.errors.schema-error");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('should log an error if passed a valid object and invalid schema', function(done) {
        var flow = [{id:"jn1",type:"json",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            try {
                var jn1 = helper.getNode("jn1");
                var jn2 = helper.getNode("jn2");
                var schema = "garbage";
                var obj =  {"number": "foo", "string": 3};
                jn1.receive({payload:obj, schema:schema});
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "json";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.should.equal("json.errors.schema-error-compile");
                        logEvents[0][0].should.have.a.property('level',helper.log().ERROR);
                        done();
                    } catch(err) { done(err) }
                },50);
            } catch(err) {
                done(err);
            }
        });
    });

    it('msg.schema property should be deleted before sending to next node (string input)', function(done) {
        var flow = [{id:"jn1",type:"json",action:"str",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.schema, undefined);
                done();
            });
            var jsonString =  '{"number":3,"string":"allo"}';
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:jsonString, schema:schema});
        });
    });

    it('msg.schema property should be deleted before sending to next node (object input)', function(done) {
        var flow = [{id:"jn1",type:"json",action:"str",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(jsonNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                should.equal(msg.schema, undefined);
                done();
            });
            var jsonObject =  {"number":3,"string":"allo"};
            var schema = {title: "testSchema", type: "object", properties: {number: {type: "number"}, string: {type: "string" }}};
            jn1.receive({payload:jsonObject, schema:schema});
        });
    });
});
