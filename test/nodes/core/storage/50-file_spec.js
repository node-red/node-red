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
var path = require('path');
var fs = require('fs-extra');
var sinon = require("sinon");
var fileNode = require("../../../../nodes/core/storage/50-file.js");
var helper = require("../../helper.js");

describe('file Nodes', function() {

    describe('file out Node', function() {

        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,"50-file-test-file.txt");
        var wait = 150;

        beforeEach(function(done) {
            //fs.writeFileSync(fileToTest, "File message line 1\File message line 2\n");
            helper.startServer(done);
        });

        afterEach(function(done) {
            helper.unload().then(function() {
                //fs.unlinkSync(fileToTest);
                helper.stopServer(done);
            });
        });

        it('should be loaded', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                var fileNode1 = helper.getNode("fileNode1");
                fileNode1.should.have.property('name', 'fileNode');
                done();
            });
        });

        it('should write to a file', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                n1.emit("input", {payload:"test"});
                setTimeout(function() {
                    var f = fs.readFileSync(fileToTest);
                    f.should.have.length(4);
                    fs.unlinkSync(fileToTest);
                    done();
                },wait);
            });
        });

        it('should append to a file and add newline', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":false}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                n1.emit("input", {payload:"test2"});    // string
                setTimeout(function() {
                    n1.emit("input", {payload:true});       // boolean
                },50);
                setTimeout(function() {
                    var f = fs.readFileSync(fileToTest).toString();
                    f.should.have.length(11);
                    f.should.equal("test2\ntrue\n");
                    done();
                },wait);
            });
        });

        it('should use msg.filename if filename not set in node', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "appendNewline":true, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                n1.emit("input", {payload:"fine", filename:fileToTest});
                setTimeout(function() {
                    var f = fs.readFileSync(fileToTest).toString();
                    f.should.have.length(5);
                    f.should.equal("fine\n");
                    done();
                },wait);
            });
        });

        it('should be able to delete the file', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":"delete"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                n1.emit("input", {payload:"fine"});
                setTimeout(function() {
                    try {
                        var f = fs.readFileSync(fileToTest).toString();
                        f.should.not.equal("fine");
                        //done();
                    }
                    catch(e) {
                        e.code.should.equal("ENOENT");
                        done();
                    }
                },wait);
            });
        });

        it('should warn if filename not set', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "appendNewline":true, "overwriteFile":false}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                n1.emit("input", {payload:"nofile"});
                setTimeout(function() {
                    try {
                        var f = fs.readFileSync(fileToTest).toString();
                        f.should.not.equal("fine");
                        //done();
                    }
                    catch(e) {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.equal("file.errors.nofilename");
                        done();
                    }
                },wait);
            });
        });

        it('ignore a missing payload', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":false}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var f = fs.readFileSync(fileToTest).toString();
                        f.should.not.equal("fine");
                        //done();
                    }
                    catch(e) {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(0);
                        done();
                    }
                },wait);
                n1.emit("input", {topic:"test"});
            });
        });

        it('should fail to write to a ro file', function(done) {
            // Stub file write so we can make writes fail
            var spy = sinon.stub(fs, 'writeFile', function(arg1,arg2,arg3,arg4) {
                arg4(new Error("Stub error message"));
            });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.writefail");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.writeFile.restore(); }
                },wait);
                n1.receive({payload:"test"});
            });
        });

        it('should fail to append to a ro file', function(done) {
            // Stub file write so we can make writes fail
            var spy = sinon.stub(fs, 'appendFile', function(arg,arg2,arg3,arg4){ arg4(new Error("Stub error message")); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":false}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.appendfail");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.appendFile.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should cope with failing to delete a file', function(done) {
            // Stub file write so we can make writes fail
            var spy = sinon.stub(fs, 'unlink', function(arg,arg2){ arg2(new Error("Stub error message")); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":"delete"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.deletefail");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.unlink.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should fail to create a new directory if not asked to do so (append)', function(done) {
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"a","50-file-test-file.txt");
            //var spy = sinon.stub(fs, 'appendFile', function(arg,arg2,arg3,arg4){ arg4(new Error("Stub error message")); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":true, "overwriteFile":false}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.appendfail");
                        done();
                    }
                    catch(e) { done(e); }
                    //finally { fs.appendFile.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should try to create a new directory if asked to do so (append)', function(done) {
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"a","50-file-test-file.txt");
            var spy = sinon.stub(fs, "ensureFile", function(arg1,arg2,arg3,arg4) { arg2(null); });
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":true, "overwriteFile":false, "createDir":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.appendfail");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.ensureFile.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should fail to create a new directory if not asked to do so (overwrite)', function(done) {
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"a","50-file-test-file.txt");
            //var spy = sinon.stub(fs, 'appendFile', function(arg,arg2,arg3,arg4){ arg4(new Error("Stub error message")); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":false, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.writefail");
                        done();
                    }
                    catch(e) { done(e); }
                    //finally { fs.appendFile.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should try to create a new directory if asked to do so (overwrite)', function(done) {
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"a","50-file-test-file.txt");
            var spy = sinon.stub(fs, "ensureFile", function(arg1,arg2,arg3,arg4){ arg2(null); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":true, "overwriteFile":true, "createDir":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("file.errors.writefail");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.ensureFile.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

    });


    describe('file in Node', function() {

        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,"50-file-test-file.txt");
        var wait = 150;

        beforeEach(function(done) {
            fs.writeFileSync(fileToTest, "File message line 1\File message line 2\n");
            helper.startServer(done);
        });

        afterEach(function(done) {
            helper.unload().then(function() {
                fs.unlinkSync(fileToTest);
                helper.stopServer(done);
            });
        });

        it('should be loaded', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"utf8"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                n1.should.have.property('name', 'fileInNode');
                done();
            });
        });

        it('should read in a file and output a buffer', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"", wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload');
                    msg.payload.should.have.length(39).and.be.a.Buffer;
                    msg.payload.toString().should.equal("File message line 1\File message line 2\n");
                    done();
                });
                n1.receive({payload:""});
            });
        });

// Commented out to make build pass on node v.0.8 - reinstate when we drop 0.8 support...
        //it('should read in a file and output a utf8 string', function(done) {
            //var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"utf8", wires:[["n2"]]},
                    //{id:"n2", type:"helper"}];
            //helper.load(fileNode, flow, function() {
                //var n1 = helper.getNode("fileInNode1");
                //var n2 = helper.getNode("n2");
                //n2.on("input", function(msg) {
                    //msg.should.have.property('payload');
                    //msg.payload.should.have.length(39).and.be.a.string;
                    //msg.payload.should.equal("File message line 1\File message line 2\n");
                    //done();
                //});
                //n1.receive({payload:""});
            //});
        //});

// Commented out as we no longer need to warn of the very old deprecated behaviour
        //it('should warn if msg.props try to overide', function(done) {
            //var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"", wires:[["n2"]]},
                    //{id:"n2", type:"helper"}];
            //helper.load(fileNode, flow, function() {
                //var n1 = helper.getNode("fileInNode1");
                //var n2 = helper.getNode("n2");
                //n2.on("input", function(msg) {
                    //msg.should.have.property('payload');
                    //msg.payload.should.have.length(39).and.be.a.Buffer;
                    //msg.payload.toString().should.equal("File message line 1\File message line 2\n");
                    //var logEvents = helper.log().args.filter(function(evt) {
                        //return evt[0].type == "file in";
                    //});
                    //logEvents.should.have.length(1);
                    //logEvents[0][0].should.have.a.property('msg');
                    //logEvents[0][0].msg.toString().should.startWith("file.errors.nooverride");
                    //done();
                //});
                //n1.receive({payload:"",filename:"foo.txt"});
            //});
        //});

        it('should warn if no filename set', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "format":""}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "file in";
                    });
                    logEvents.should.have.length(1);
                    logEvents[0][0].should.have.a.property('msg');
                    logEvents[0][0].msg.toString().should.equal("file.errors.nofilename");
                    done();
                },wait);
                n1.receive({});
            });
        });

        it('should handle a file read error', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":"badfile", "format":""}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                setTimeout(function() {
                    var logEvents = helper.log().args.filter(function(evt) {
                        return evt[0].type == "file in";
                    });
                    logEvents.should.have.length(1);
                    logEvents[0][0].should.have.a.property('msg');
                    //logEvents[0][0].msg.toString().should.equal("Error: ENOENT, open 'badfile'");
                    logEvents[0][0].msg.toString().should.startWith("Error: ENOENT");
                    done();
                },wait);
                n1.receive({payload:""});
            });
        });

    });

});
