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
var path = require('path');
var fs = require('fs-extra');
var os = require('os');
var sinon = require("sinon");
var fileNode = require("../../../../nodes/core/storage/50-file.js");
var helper = require("node-red-node-test-helper");

describe('file Nodes', function() {

    describe('file out Node', function() {

        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,"50-file-test-file.txt");
        var wait = 250;

        beforeEach(function(done) {
            //fs.writeFileSync(fileToTest, "File message line 1\File message line 2\n");
            helper.startServer(done);
        });

        afterEach(function(done) {
            fs.removeSync(path.join(resourcesDir,"file-out-node"));
            helper.unload().then(function() {
                //fs.unlinkSync(fileToTest);
                helper.stopServer(done);
            });
        });

        it('should be loaded', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":true}];
            helper.load(fileNode, flow, function() {
                try {
                    var fileNode1 = helper.getNode("fileNode1");
                    fileNode1.should.have.property('name', 'fileNode');
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });

        it('should write to a file', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                n2.on("input", function(msg) {
                    try {
                        var f = fs.readFileSync(fileToTest);
                        f.should.have.length(4);
                        fs.unlinkSync(fileToTest);
                        msg.should.have.property("payload", "test");
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"test"});
            });
        });

        it('should append to a file and add newline', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":true, "overwriteFile":false, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            try {
                fs.unlinkSync(fileToTest);
            } catch(err) {
            }
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                var count = 0;
                var data = ["test2", true, 999, [2]];

                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload");
                        data.should.containDeep([msg.payload]);
                        if (count === 3) {
                            var f = fs.readFileSync(fileToTest).toString();
                            if (os.type() !== "Windows_NT") {
                                f.should.have.length(19);
                                f.should.equal("test2\ntrue\n999\n[2]\n");
                            }
                            else {
                                f.should.have.length(23);
                                f.should.equal("test2\r\ntrue\r\n999\r\n[2]\r\n");
                            }
                            done();
                        }
                        count++;
                    }
                    catch (e) {
                        done(e);
                    }
                });

                n1.receive({payload:"test2"});    // string
                setTimeout(function() {
                    n1.receive({payload:true});       // boolean
                },30);
                setTimeout(function() {
                    n1.receive({payload:999});        // number
                },60);
                setTimeout(function() {
                    n1.receive({payload:[2]});        // object (array)
                },90);
            });
        });

        it('should append to a file after it has been deleted ', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":false, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            try {
                fs.unlinkSync(fileToTest);
            } catch(err) {
            }
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                var data = ["one", "two", "three", "four"];
                var count = 0;
                
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload");
                        data.should.containDeep([msg.payload]);
                        try {
                            if (count === 1) {
                                // Check they got appended as expected
                                var f = fs.readFileSync(fileToTest).toString();
                                f.should.equal("onetwo");

                                // Delete the file
                                fs.unlinkSync(fileToTest);
                                setTimeout(function() {
                                    // Send two more messages to the file
                                    n1.receive({payload:"three"});
                                    n1.receive({payload:"four"});
                                }, wait);
                            }
                            if (count === 3) {
                                var f = fs.readFileSync(fileToTest).toString();
                                f.should.equal("threefour");
                                fs.unlinkSync(fileToTest);
                                done();
                            }
                        } catch(err) {
                            done(err);
                        }
                        count++;
                    }
                    catch (e) {
                        done(e);
                    }
                });
                
                // Send two messages to the file
                n1.receive({payload:"one"});
                n1.receive({payload:"two"});
            });
        });

        it('should append to a file after it has been recreated ', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":false, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            try {
                fs.unlinkSync(fileToTest);
            } catch(err) {
            }
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                var data = ["one", "two", "three", "four"];
                var count = 0;
                
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload");
                        data.should.containDeep([msg.payload]);
                        if (count == 1) {
                            // Check they got appended as expected
                            var f = fs.readFileSync(fileToTest).toString();
                            f.should.equal("onetwo");

                            if (os.type() === "Windows_NT") {
                                var dummyFile = path.join(resourcesDir,"50-file-test-dummy.txt");
                                fs.rename(fileToTest, dummyFile, function() {
                                    recreateTest(n1, dummyFile);
                                });
                            } else {
                                recreateTest(n1, fileToTest);
                            }
                        }
                        if (count == 3) {
                            // Check the file was updated
                            try {
                                var f = fs.readFileSync(fileToTest).toString();
                                f.should.equal("threefour");
                                fs.unlinkSync(fileToTest);
                                done();
                            } catch(err) {
                                done(err);
                            }
                        }
                    } catch(err) {
                        done(err);
                    }
                    count++;
                });

                // Send two messages to the file
                n1.receive({payload:"one"});
                n1.receive({payload:"two"});
            });

            function recreateTest(n1, fileToDelete) {
                // Delete the file
                fs.unlinkSync(fileToDelete);

                // Recreate it
                fs.writeFileSync(fileToTest,"");

                // Send two more messages to the file
                n1.receive({payload:"three"});
                n1.receive({payload:"four"});
            }
        });


        it('should use msg.filename if filename not set in node', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "appendNewline":true, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                
                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "fine");
                        msg.should.have.property("filename", fileToTest);

                        var f = fs.readFileSync(fileToTest).toString();
                        if (os.type() !== "Windows_NT") {
                            f.should.have.length(5);
                            f.should.equal("fine\n");
                        }
                        else {
                            f.should.have.length(6);
                            f.should.equal("fine\r\n");
                        }
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });

                n1.receive({payload:"fine", filename:fileToTest});
            });
        });

        it('should be able to delete the file', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":"delete", wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                
                n2.on("input", function (msg) {
                    try {
                        var f = fs.readFileSync(fileToTest).toString();
                        f.should.not.equal("fine");
                        //done();
                    }
                    catch(e) {
                        e.code.should.equal("ENOENT");
                        done();
                    }
                });

                n1.receive({payload:"fine"});
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
            var spy = sinon.stub(fs, 'createWriteStream', function(arg1,arg2) {
                var ws = {};
                ws.on = function(e,d) { throw("Stub error message"); }
                ws.write = function(e,d) { }
                return ws;
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
                        logEvents[0][0].msg.toString().should.startWith("Stub error message");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.createWriteStream.restore(); }
                },wait);
                n1.receive({payload:"test"});
            });
        });

        it('should fail to append to a ro file', function(done) {
            // Stub file write so we can make writes fail
            var spy = sinon.stub(fs, 'createWriteStream', function(arg1,arg2) {
                var ws = {};
                ws.on = function(e,d) { throw("Stub error message"); }
                ws.write = function(e,d) { }
                return ws;
            });

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
                        logEvents[0][0].msg.toString().should.startWith("Stub error message");
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.createWriteStream.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should cope with failing to delete a file', function(done) {
            // Stub file write so we can make writes fail
            var spy = sinon.stub(fs, 'unlink', function(arg,arg2) { arg2(new Error("Stub error message")); });

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
            var fileToTest2 = path.join(resourcesDir,"file-out-node","50-file-test-file.txt");
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
            // fs.writeFileSync of afterEach failed on Windows.
            if (os.type() === "Windows_NT") {
                done();
                return;
            }
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"file-out-node","50-file-test-file.txt");
            var spy = sinon.stub(fs, "ensureDir", function(arg1,arg2,arg3,arg4) { arg2(null); });
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":true, "overwriteFile":false, "createDir":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(0);
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.ensureDir.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should fail to create a new directory if not asked to do so (overwrite)', function(done) {
            // Stub file write so we can make writes fail
            var fileToTest2 = path.join(resourcesDir,"file-out-node","50-file-test-file.txt");
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
            var fileToTest2 = path.join(resourcesDir,"file-out-node","50-file-test-file.txt");
            var spy = sinon.stub(fs, "ensureDir", function(arg1,arg2,arg3,arg4) { arg2(null); });

            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest2, "appendNewline":true, "overwriteFile":true, "createDir":true}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                setTimeout(function() {
                    try {
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file";
                        });
                        //console.log(logEvents);
                        logEvents.should.have.length(0);
                        done();
                    }
                    catch(e) { done(e); }
                    finally { fs.ensureDir.restore(); }
                },wait);
                n1.receive({payload:"test2"});
            });
        });

        it('should write to multiple files', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "appendNewline":true, "overwriteFile":true, "createDir":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            var tmp_path = path.join(resourcesDir, "tmp");
            var len = 1024*1024*10;
            var file_count = 5;
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                var count = 0;
                n2.on("input", function(msg) {
                    try {
                        count++;
                        if (count == file_count) {
                            for(var i = 0; i < file_count; i++) {
                                var name = path.join(tmp_path, String(i));
                                var f = fs.readFileSync(name);
                                f.should.have.length(len);
                                f[0].should.have.equal(i);
                            }
                            fs.removeSync(tmp_path);
                            done();
                        }
                    }
                    catch (e) {
                        try {
                            fs.removeSync(tmp_path);
                        }
                        catch (e1) {
                        }
                        done(e);
                    }
                });
                for(var i = 0; i < file_count; i++) {
                    var data = new Buffer(len);
                    data.fill(i);
                    var name = path.join(tmp_path, String(i));
                    var msg = {payload:data, filename:name};
                    n1.receive(msg);
                }
            });
        });

        it('should write to multiple files if node is closed', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "appendNewline":true, "overwriteFile":true, "createDir":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            var tmp_path = path.join(resourcesDir, "tmp");
            var len = 1024*1024*10;
            var file_count = 5;
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                var count = 0;
                n2.on("input", function(msg) {
                    try {
                        count++;
                        if (count == file_count) {
                            for(var i = 0; i < file_count; i++) {
                                var name = path.join(tmp_path, String(i));
                                var f = fs.readFileSync(name);
                                f.should.have.length(len);
                                f[0].should.have.equal(i);
                            }
                            fs.removeSync(tmp_path);
                            done();
                        }
                    }
                    catch (e) {
                        try {
                            fs.removeSync(tmp_path);
                        }
                        catch (e1) {
                        }
                        done(e);
                    }
                });
                for(var i = 0; i < file_count; i++) {
                    var data = new Buffer(len);
                    data.fill(i);
                    var name = path.join(tmp_path, String(i));
                    var msg = {payload:data, filename:name};
                    n1.receive(msg);
                }
                n1.close();
            });
        });

    });


    describe('file in Node', function() {

        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,"50-file-test-file.txt");
        var wait = 150;

        beforeEach(function(done) {
            fs.writeFileSync(fileToTest, "File message line 1\nFile message line 2\n");
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
            var flow = [{id:"fileInNode1", type:"file in", name:"fileInNode", "filename":fileToTest, "format":"", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload');
                    Buffer.isBuffer(msg.payload).should.be.true();
                    msg.payload.should.have.length(40);
                    msg.payload.toString().should.equal('File message line 1\nFile message line 2\n');
                    done();
                });
                n1.receive({payload:""});
            });
        });

        it('should read in a file and output a utf8 string', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"utf8", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.be.a.String();
                        msg.payload.should.have.length(40)
                        msg.payload.should.equal("File message line 1\nFile message line 2\n");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:""});
            });
        });

        it('should read in a file and output split lines with parts', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", filename:fileToTest, format:"lines", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.be.a.String();
                        msg.should.have.property('parts');
                        msg.parts.should.have.property('index',c);
                        msg.parts.should.have.property('type','string');
                        msg.parts.should.have.property('ch','\n');
                        if (c === 0) {
                            msg.payload.should.equal("File message line 1");
                        }
                        if (c === 1) {
                            msg.payload.should.equal("File message line 2");
                        }
                        if (c === 2) {
                            msg.payload.should.equal("");
                            done();
                        }
                        c++;
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:""});
            });
        });

        it('should read in a file with empty line and output split lines with parts', function(done) {
            var data = ["-", "", "-", ""];
            var line = data.join("\n");
            fs.writeFileSync(fileToTest, line);
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", filename:fileToTest, format:"lines", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.equal(data[c]);
                        msg.should.have.property('parts');
                        var parts = msg.parts;
                        parts.should.have.property('index',c);
                        parts.should.have.property('type','string');
                        parts.should.have.property('ch','\n');
                        c++;
                        if (c === data.length) {
                            parts.should.have.property('count', data.length);
                            done();
                        }
                        else {
                            parts.should.not.have.property('count');
                        }
                    }
                    catch(e) {
                        done(e);
                    }
                });
                n1.receive({payload:""});
            });
        });

        it('should read in a file and output a buffer with parts', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", filename:fileToTest, format:"stream", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                n2.on("input", function(msg) {
                    msg.should.have.property('payload');
                    Buffer.isBuffer(msg.payload).should.be.true();
                    msg.payload.should.have.length(40);
                    msg.should.have.property('parts');
                    msg.parts.should.have.property('count',1);
                    msg.parts.should.have.property('type','buffer');
                    msg.parts.should.have.property('ch','');
                    done();
                });
                n1.receive({payload:""});
            });
        });

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
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":"badfile", "format":"", wires:[["n2"]]},
                        {id:"n2", type:"helper"}
                       ];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");

                n2.on("input", function(msg) {
                    try {
                        msg.should.not.have.property('payload');
                        msg.should.have.property("error");
                        msg.error.should.have.property("code","ENOENT");
                        var logEvents = helper.log().args.filter(function(evt) {
                            return evt[0].type == "file in";
                        });
                        logEvents.should.have.length(1);
                        logEvents[0][0].should.have.a.property('msg');
                        logEvents[0][0].msg.toString().should.startWith("Error");
                        done();
                    } catch(err) {
                        done(err);
                    }
                });
                n1.receive({payload:""});
            });
        });
    });
});
