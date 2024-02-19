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

var path = require('path');
var fs = require('fs-extra');
var os = require('os');
var sinon = require("sinon");
var iconv = require("iconv-lite");
var fileNode = require("nr-test-utils").require("@node-red/nodes/core/storage/10-file.js");
var helper = require("node-red-node-test-helper");
var RED = require("nr-test-utils").require("node-red/lib/red");

describe('file Nodes', function() {

    function encode(s, enc) {
        if (enc === "none") {
            return Buffer.from(s);
        }
        return iconv.encode(s, enc);
    }

    function decode(data, enc) {
        if (enc === "none") {
            return data.toString();
        }
        return iconv.decode(data, enc);
    }

    describe('file out Node', function() {

        var relativePathToFile = "50-file-test-file.txt";
        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,relativePathToFile);
        var wait = 250;

        beforeEach(function(done) {
            //fs.writeFileSync(fileToTest, "File message line 1\File message line 2\n");
            process.env.TEST_FILE = fileToTest;
            helper.startServer(done);
        });

        afterEach(function(done) {
            delete RED.settings.fileWorkingDirectory;
            fs.removeSync(path.join(resourcesDir,"file-out-node"));
            helper.unload().then(function() {
                //fs.unlinkSync(fileToTest);
                helper.stopServer(done);
            });
            delete process.env.TEST_FILE
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

        it('should write to a file using JSONata', function(done) {
            var fileToTest4jsonata = "'" + resourcesDir + "/'&(20+30)&'-file-test-file.txt'";
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename": fileToTest4jsonata, "filenameType": "jsonata", "appendNewline":false, "overwriteFile":true, wires: [["helperNode1"]]},
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

        it('should write to a file using RED.settings.fileWorkingDirectory', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":relativePathToFile, "appendNewline":false, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                RED.settings.fileWorkingDirectory = resourcesDir;
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

        it('should write multi-byte string to a file', function(done) {
            var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                n2.on("input", function(msg) {
                    try {
                        var f = fs.readFileSync(fileToTest).toString();
                        f.should.have.length(2);
                        f.should.equal("試験");
                        fs.unlinkSync(fileToTest);
                        msg.should.have.property("payload", "試験");
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });
                n1.receive({payload:"試験"});
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

        it('should append to a file and add newline, except last line of multipart input', function(done) {
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
                //var data = ["Line1", "Line2"];

                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload");
                        //data.should.containDeep([msg.payload]);
                        if (count === 3) {
                            var f = fs.readFileSync(fileToTest).toString();
                            if (os.type() !== "Windows_NT") {
                                f.should.have.length(23);
                                f.should.equal("Line1\nLine2\nLine3\nLine4");
                            }
                            else {
                                f.should.have.length(23);
                                f.should.equal("Line1\r\nLine2\r\nLine3\r\nLine4");
                            }
                            done();
                        }
                        count++;
                    }
                    catch (e) {
                        done(e);
                    }
                });

                n1.receive({payload:"Line1",parts:{index:0,type:"string"}});    // string
                setTimeout(function() {
                    n1.receive({payload:"Line2",parts:{index:1,type:"string"}});    // string
                },30);
                setTimeout(function() {
                    n1.receive({payload:"Line3",parts:{index:2,type:"string"}});    // string
                },60);
                setTimeout(function() {
                    n1.receive({payload:"Line4",parts:{index:3,type:"string",count:4}});    // string
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
        it('should use msg._user_specified_filename set in nodes typedInput', function(done) {
            var flow = [{id:"fileNode1", type:"file", filename:"_user_specified_filename", filenameType: "msg", name: "fileNode", "appendNewline":true, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");

                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "typedInput");
                        msg.should.have.property("filename", fileToTest);

                        var f = fs.readFileSync(fileToTest).toString();
                        if (os.type() !== "Windows_NT") {
                            f.should.equal("typedInput\n");
                        }
                        else {
                            f.should.equal("typedInput\r\n");
                        }
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });

                n1.receive({payload:"typedInput", _user_specified_filename:fileToTest});
            });
        });

        it('should support number in msg._user_specified_filename', function (done) {
            var flow = [{id:"fileNode1", type:"file", filename:"_user_specified_filename", filenameType:"msg", name:"fileNode", "appendNewline":false, "overwriteFile":true, wires:[["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function () {
                RED.settings.fileWorkingDirectory = resourcesDir;
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");
                n2.on("input", function (msg) {
                    try {
                        var fileToTest = path.join(resourcesDir, "123");
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
                n1.receive({payload: "test", _user_specified_filename: 123});
            });
        });

        it('should use env.TEST_FILE set in nodes typedInput', function(done) {
            var flow = [{id:"fileNode1", type:"file", filename:"TEST_FILE", filenameType: "env", name: "fileNode", "appendNewline":true, "overwriteFile":true, wires: [["helperNode1"]]},
                        {id:"helperNode1", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileNode1");
                var n2 = helper.getNode("helperNode1");

                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "envTest");
                        msg.should.have.property("filename", fileToTest);

                        var f = fs.readFileSync(fileToTest).toString();
                        if (os.type() !== "Windows_NT") {
                            f.should.equal("envTest\n");
                        }
                        else {
                            f.should.equal("envTest\r\n");
                        }
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                });

                n1.receive({payload:"envTest"});
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
            var spy = sinon.stub(fs, 'createWriteStream').callsFake(function(arg1,arg2) {
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
            var spy = sinon.stub(fs, 'createWriteStream').callsFake(function(arg1,arg2) {
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
            var spy = sinon.stub(fs, 'unlink').callsFake(function(arg,arg2) { arg2(new Error("Stub error message")); });

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
            //var spy = sinon.stub(fs, 'appendFile').callsFake(function(arg,arg2,arg3,arg4){ arg4(new Error("Stub error message")); });

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
            var spy = sinon.stub(fs, "ensureDir").callsFake(function(arg1,arg2,arg3,arg4) { arg2(null); });
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
            //var spy = sinon.stub(fs, 'appendFile').callsFake(function(arg,arg2,arg3,arg4){ arg4(new Error("Stub error message")); });

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
            var spy = sinon.stub(fs, "ensureDir").callsFake(function(arg1,arg2,arg3,arg4) { arg2(null); });

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
                    var data = Buffer.alloc?Buffer.alloc(len):new Buffer(len);
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
                    var data = Buffer.alloc?Buffer.alloc(len):new Buffer(len);
                    data.fill(i);
                    var name = path.join(tmp_path, String(i));
                    var msg = {payload:data, filename:name};
                    n1.receive(msg);
                }
                n1.close();
            });
        });

        describe('encodings', function() {

            function checkWriteWithEncoding(enc, data, done) {
                var flow = [{id:"fileNode1", type:"file", name: "fileNode", "filename":fileToTest, "appendNewline":false, "overwriteFile":true, encoding:enc, wires: [["helperNode1"]]},
                            {id:"helperNode1", type:"helper"}];
                helper.load(fileNode, flow, function() {
                    var n1 = helper.getNode("fileNode1");
                    var n2 = helper.getNode("helperNode1");
                    n2.on("input", function(msg) {
                        try {
                            var f = fs.readFileSync(fileToTest);
                            f.equals(encode(data, enc)).should.be.true();
                            fs.unlinkSync(fileToTest);
                            msg.should.have.property("payload", data);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    });
                    n1.receive({payload:data});
                });
            }

            // default
            it('should write to a file with "none" encoding', function(done) {
                checkWriteWithEncoding("none", "test", done);
            });

            // Native
            it('should write to a file with "utf8" encoding', function(done) {
                checkWriteWithEncoding("utf8", "試験", done);
            });

            it('should write to a file with "ucs2" encoding', function(done) {
                checkWriteWithEncoding("ucs2", "試験", done);
            });

            it('should write to a file with "utf-16le" encoding', function(done) {
                checkWriteWithEncoding("utf-16le", "試験", done);
            });

            it('should write to a file with "binary" encoding', function(done) {
                checkWriteWithEncoding("binary", "test", done);
            });

            it('should write to a file with "base64" encoding', function(done) {
                checkWriteWithEncoding("base64", "5pel5pys6KqeCg==", done);
            });

            it('should write to a file with "hex" encoding', function(done) {
                checkWriteWithEncoding("hex", "deadbeef", done);
            });

            // Unicode
            it('should write to a file with "utf-16be" encoding', function(done) {
                checkWriteWithEncoding("utf-16be", "試験", done);
            });

            // Japanese
            it('should write to a file with "Shift_JIS" encoding', function(done) {
                checkWriteWithEncoding("Shift_JIS", "試験", done);
            });

            it('should write to a file with "Windows-31j" encoding', function(done) {
                checkWriteWithEncoding("Windows-31j", "試験", done);
            });

            it('should write to a file with "Windows932" encoding', function(done) {
                checkWriteWithEncoding("Windows932", "試験", done);
            });

            it('should write to a file with "EUC-JP" encoding', function(done) {
                checkWriteWithEncoding("EUC-JP", "試験", done);
            });

            // following encoding tests should be more specific
            // Chinese
            it('should write to a file with "GB2312" encoding', function(done) {
                checkWriteWithEncoding("GB2312", "test", done);
            });

            it('should write to a file with "GBK" encoding', function(done) {
                checkWriteWithEncoding("GBK", "test", done);
            });

            it('should write to a file with "GB18030" encoding', function(done) {
                checkWriteWithEncoding("GB18030", "test", done);
            });

            it('should write to a file with "Windows936" encoding', function(done) {
                checkWriteWithEncoding("Windows936", "test", done);
            });

            it('should write to a file with "EUC-CN" encoding', function(done) {
                checkWriteWithEncoding("EUC-CN", "test", done);
            });

            // Korean
            it('should write to a file with "KS_C_5601" encoding', function(done) {
                checkWriteWithEncoding("KS_C_5601", "test", done);
            });

            it('should write to a file with "Windows949" encoding', function(done) {
                checkWriteWithEncoding("Windows949", "test", done);
            });

            it('should write to a file with "EUC-KR" encoding', function(done) {
                checkWriteWithEncoding("EUC-KR", "test", done);
            });

            // Taiwan/Hong Kong
            it('should write to a file with "Big5" encoding', function(done) {
                checkWriteWithEncoding("Big5", "test", done);
            });

            it('should write to a file with "Big5-HKSCS" encoding', function(done) {
                checkWriteWithEncoding("Big5-HKSCS", "test", done);
            });

            it('should write to a file with "Windows950" encoding', function(done) {
                checkWriteWithEncoding("Windows950", "test", done);
            });

            // Windows
            it('should write to a file with "cp874" encoding', function(done) {
                checkWriteWithEncoding("cp874", "test", done);
            });

            it('should write to a file with "cp1250" encoding', function(done) {
                checkWriteWithEncoding("cp1250", "test", done);
            });

            it('should write to a file with "cp1251" encoding', function(done) {
                checkWriteWithEncoding("cp1251", "test", done);
            });

            it('should write to a file with "cp1252" encoding', function(done) {
                checkWriteWithEncoding("cp1252", "test", done);
            });

            it('should write to a file with "cp1253" encoding', function(done) {
                checkWriteWithEncoding("cp1253", "test", done);
            });

            it('should write to a file with "cp1254" encoding', function(done) {
                checkWriteWithEncoding("cp1254", "test", done);
            });

            it('should write to a file with "cp1255" encoding', function(done) {
                checkWriteWithEncoding("cp1255", "test", done);
            });

            it('should write to a file with "cp1256" encoding', function(done) {
                checkWriteWithEncoding("cp1256", "test", done);
            });

            it('should write to a file with "cp1257" encoding', function(done) {
                checkWriteWithEncoding("cp1257", "test", done);
            });

            it('should write to a file with "cp1258" encoding', function(done) {
                checkWriteWithEncoding("cp1258", "test", done);
            });

            // IBM
            it('should write to a file with "cp437" encoding', function(done) {
                checkWriteWithEncoding("cp437", "test", done);
            });

            it('should write to a file with "cp737" encoding', function(done) {
                checkWriteWithEncoding("cp737", "test", done);
            });

            it('should write to a file with "cp775" encoding', function(done) {
                checkWriteWithEncoding("cp775", "test", done);
            });

            it('should write to a file with "cp808" encoding', function(done) {
                checkWriteWithEncoding("cp808", "test", done);
            });

            it('should write to a file with "cp850" encoding', function(done) {
                checkWriteWithEncoding("cp850", "test", done);
            });

            it('should write to a file with "cp852" encoding', function(done) {
                checkWriteWithEncoding("cp852", "test", done);
            });

            it('should write to a file with "cp855" encoding', function(done) {
                checkWriteWithEncoding("cp855", "test", done);
            });

            it('should write to a file with "cp856" encoding', function(done) {
                checkWriteWithEncoding("cp856", "test", done);
            });

            it('should write to a file with "cp857" encoding', function(done) {
                checkWriteWithEncoding("cp857", "test", done);
            });

            it('should write to a file with "cp858" encoding', function(done) {
                checkWriteWithEncoding("cp858", "test", done);
            });

            it('should write to a file with "cp860" encoding', function(done) {
                checkWriteWithEncoding("cp860", "test", done);
            });

            it('should write to a file with "cp861" encoding', function(done) {
                checkWriteWithEncoding("cp861", "test", done);
            });

            it('should write to a file with "cp866" encoding', function(done) {
                checkWriteWithEncoding("cp866", "test", done);
            });

            it('should write to a file with "cp869" encoding', function(done) {
                checkWriteWithEncoding("cp869", "test", done);
            });

            it('should write to a file with "cp922" encoding', function(done) {
                checkWriteWithEncoding("cp922", "test", done);
            });

            it('should write to a file with "cp1046" encoding', function(done) {
                checkWriteWithEncoding("cp1046", "test", done);
            });

            it('should write to a file with "cp1124" encoding', function(done) {
                checkWriteWithEncoding("cp1124", "test", done);
            });

            it('should write to a file with "cp1125" encoding', function(done) {
                checkWriteWithEncoding("cp1125", "test", done);
            });

            it('should write to a file with "cp1129" encoding', function(done) {
                checkWriteWithEncoding("cp1129", "test", done);
            });

            it('should write to a file with "cp1133" encoding', function(done) {
                checkWriteWithEncoding("cp1133", "test", done);
            });

            it('should write to a file with "cp1161" encoding', function(done) {
                checkWriteWithEncoding("cp1161", "test", done);
            });

            it('should write to a file with "cp1162" encoding', function(done) {
                checkWriteWithEncoding("cp1162", "test", done);
            });

            it('should write to a file with "cp1163" encoding', function(done) {
                checkWriteWithEncoding("cp1163", "test", done);
            });

            // Mac
            it('should write to a file with "maccroatian" encoding', function(done) {
                checkWriteWithEncoding("maccroatian", "test", done);
            });

            it('should write to a file with "maccyrillic" encoding', function(done) {
                checkWriteWithEncoding("maccyrillic", "test", done);
            });

            it('should write to a file with "macgreek" encoding', function(done) {
                checkWriteWithEncoding("macgreek", "test", done);
            });

            it('should write to a file with "maciceland" encoding', function(done) {
                checkWriteWithEncoding("maciceland", "test", done);
            });

            it('should write to a file with "macroman" encoding', function(done) {
                checkWriteWithEncoding("macroman", "test", done);
            });

            it('should write to a file with "macromania" encoding', function(done) {
                checkWriteWithEncoding("macromania", "test", done);
            });

            it('should write to a file with "macthai" encoding', function(done) {
                checkWriteWithEncoding("macthai", "test", done);
            });

            it('should write to a file with "macturkish" encoding', function(done) {
                checkWriteWithEncoding("macturkish", "test", done);
            });

            it('should write to a file with "macukraine" encoding', function(done) {
                checkWriteWithEncoding("macukraine", "test", done);
            });

            it('should write to a file with "maccenteuro" encoding', function(done) {
                checkWriteWithEncoding("maccenteuro", "test", done);
            });

            it('should write to a file with "macintosh" encoding', function(done) {
                checkWriteWithEncoding("macintosh", "test", done);
            });

            // KOI8
            it('should write to a file with "koi8-r" encoding', function(done) {
                checkWriteWithEncoding("koi8-r", "test", done);
            });

            it('should write to a file with "koi8-u" encoding', function(done) {
                checkWriteWithEncoding("koi8-u", "test", done);
            });

            it('should write to a file with "koi8-ru" encoding', function(done) {
                checkWriteWithEncoding("koi8-ru", "test", done);
            });

            it('should write to a file with "koi8-t" encoding', function(done) {
                checkWriteWithEncoding("koi8-t", "test", done);
            });

            // Misc
            it('should write to a file with "armscii8" encoding', function(done) {
                checkWriteWithEncoding("armscii8", "test", done);
            });

            it('should write to a file with "rk1048" encoding', function(done) {
                checkWriteWithEncoding("rk1048", "test", done);
            });

            it('should write to a file with "tcvn" encoding', function(done) {
                checkWriteWithEncoding("tcvn", "test", done);
            });

            it('should write to a file with "georgianacademy" encoding', function(done) {
                checkWriteWithEncoding("georgianacademy", "test", done);
            });

            it('should write to a file with "georgianps" encoding', function(done) {
                checkWriteWithEncoding("georgianps", "test", done);
            });

            it('should write to a file with "pt154" encoding', function(done) {
                checkWriteWithEncoding("pt154", "test", done);
            });

            it('should write to a file with "viscii" encoding', function(done) {
                checkWriteWithEncoding("viscii", "test", done);
            });

            it('should write to a file with "iso646cn" encoding', function(done) {
                checkWriteWithEncoding("iso646cn", "test", done);
            });

            it('should write to a file with "iso646jp" encoding', function(done) {
                checkWriteWithEncoding("iso646jp", "test", done);
            });

            it('should write to a file with "hproman8" encoding', function(done) {
                checkWriteWithEncoding("hproman8", "test", done);
            });

            it('should write to a file with "tis620" encoding', function(done) {
                checkWriteWithEncoding("tis620", "test", done);
            });

        });
    });


    describe('file in Node', function() {

        var relativePathToFile = "50-file-test-file.txt";
        var resourcesDir = path.join(__dirname,"..","..","..","resources");
        var fileToTest = path.join(resourcesDir,relativePathToFile);
        var fileToTest2 = "\t"+path.join(resourcesDir,relativePathToFile)+"\r\n";
        var wait = 150;

        beforeEach(function(done) {
            fs.writeFileSync(fileToTest, "File message line 1\nFile message line 2\n");
            helper.startServer(done);
        });

        afterEach(function(done) {
            delete RED.settings.fileWorkingDirectory;
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

        it('should read in a file using JSONata and output a utf8 string', function(done) {
            var fileToTest4jsonata = "'" + resourcesDir + "/'&(20+30)&'-file-test-file.txt'";
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest4jsonata, "filenameType": "jsonata", "format":"utf8", wires:[["n2"]]},
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

        it('should read in a file using fileWorkingDirectory to set cwd', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":relativePathToFile, "format":"utf8", wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                RED.settings.fileWorkingDirectory = resourcesDir;
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


        it('should read in a file ending in cr and output a utf8 string', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest2, "format":"utf8", wires:[["n2"]]},
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
                        msg.should.have.property('topic');
                        msg.should.not.have.property('foo');
                        msg.should.not.have.property('bar');
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
                n1.receive({payload:"",topic:"A",foo:"bar",bar:"foo"});
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

        it('should read in a file and output split lines with parts and extra props', function(done) {
            var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", filename:fileToTest, format:"lines", allProps:true, wires:[["n2"]]},
                        {id:"n2", type:"helper"}];
            helper.load(fileNode, flow, function() {
                var n1 = helper.getNode("fileInNode1");
                var n2 = helper.getNode("n2");
                var c = 0;
                n2.on("input", function(msg) {
                    // console.log(msg)
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.be.a.String();
                        msg.should.have.property('topic');
                        msg.should.have.property('foo');
                        msg.should.have.property('bar');
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
                n1.receive({payload:"",topic:"B",foo:"bar",bar:"foo"});
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

        describe('encodings', function() {

            function checkReadWithEncoding(enc, data, done) {
                var flow = [{id:"fileInNode1", type:"file in", name: "fileInNode", "filename":fileToTest, "format":"utf8", encoding:enc, wires:[["n2"]]},
                            {id:"n2", type:"helper"}];

                fs.writeFileSync(fileToTest, encode(data, enc));
                helper.load(fileNode, flow, function() {
                    var n1 = helper.getNode("fileInNode1");
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                        try {
                            msg.should.have.property('payload');
                            msg.payload.should.be.a.String();
                            msg.payload.should.equal(data);
                            done();
                        } catch(err) {
                            done(err);
                        }
                    });
                    n1.receive({payload:""});
                });
            }

            // default
            it('should read in a file with "none" encoding', function(done) {
                checkReadWithEncoding("none", "試験", done);
            });

            // Native
            it('should read in a file with "utf8" encoding', function(done) {
                checkReadWithEncoding("utf8", "試験", done);
            });

            it('should read in a file with "ucs2" encoding', function(done) {
                checkReadWithEncoding("ucs2", "試験", done);
            });

            it('should read in a file with "utf-16le" encoding', function(done) {
                checkReadWithEncoding("utf-16le", "試験", done);
            });

            it('should read in a file with "binary" encoding', function(done) {
                checkReadWithEncoding("binary", "test", done);
            });

            it('should read in a file with "base64" encoding', function(done) {
                checkReadWithEncoding("base64", "5pel5pys6KqeCg==", done);
            });

            it('should read in a file with "hex" encoding', function(done) {
                checkReadWithEncoding("hex", "deadbeef", done);
            });

            // Unicode
            it('should read in a file with "utf-16be" encoding', function(done) {
                checkReadWithEncoding("utf-16be", "試験", done);
            });

            // Japanese
            it('should read in a file with "Shift_JIS" encoding', function(done) {
                checkReadWithEncoding("Shift_JIS", "試験", done);
            });

            it('should read in a file with "Windows-31j" encoding', function(done) {
                checkReadWithEncoding("Windows-31j", "試験", done);
            });

            it('should read in a file with "Windows932" encoding', function(done) {
                checkReadWithEncoding("Windows932", "試験", done);
            });

            it('should read in a file with "EUC-JP" encoding', function(done) {
                checkReadWithEncoding("EUC-JP", "試験", done);
            });

            // following encoding tests should be more specific
            // Chinese
            it('should read in a file with "GB2312" encoding', function(done) {
                checkReadWithEncoding("GB2312", "test", done);
            });

            it('should read in a file with "GBK" encoding', function(done) {
                checkReadWithEncoding("GBK", "test", done);
            });

            it('should read in a file with "GB18030" encoding', function(done) {
                checkReadWithEncoding("GB18030", "test", done);
            });

            it('should read in a file with "Windows936" encoding', function(done) {
                checkReadWithEncoding("Windows936", "test", done);
            });

            it('should read in a file with "EUC-CN" encoding', function(done) {
                checkReadWithEncoding("EUC-CN", "test", done);
            });

            // Korean
            it('should read in a file with "KS_C_5601" encoding', function(done) {
                checkReadWithEncoding("KS_C_5601", "test", done);
            });

            it('should read in a file with "Windows949" encoding', function(done) {
                checkReadWithEncoding("Windows949", "test", done);
            });

            it('should read in a file with "EUC-KR" encoding', function(done) {
                checkReadWithEncoding("EUC-KR", "test", done);
            });

            // Taiwan/Hong Kong
            it('should read in a file with "Big5" encoding', function(done) {
                checkReadWithEncoding("Big5", "test", done);
            });

            it('should read in a file with "Big5-HKSCS" encoding', function(done) {
                checkReadWithEncoding("Big5-HKSCS", "test", done);
            });

            it('should read in a file with "Windows950" encoding', function(done) {
                checkReadWithEncoding("Windows950", "test", done);
            });

            // Windows
            it('should read in a file with "cp874" encoding', function(done) {
                checkReadWithEncoding("cp874", "test", done);
            });

            it('should read in a file with "cp1250" encoding', function(done) {
                checkReadWithEncoding("cp1250", "test", done);
            });

            it('should read in a file with "cp1251" encoding', function(done) {
                checkReadWithEncoding("cp1251", "test", done);
            });

            it('should read in a file with "cp1252" encoding', function(done) {
                checkReadWithEncoding("cp1252", "test", done);
            });

            it('should read in a file with "cp1253" encoding', function(done) {
                checkReadWithEncoding("cp1253", "test", done);
            });

            it('should read in a file with "cp1254" encoding', function(done) {
                checkReadWithEncoding("cp1254", "test", done);
            });

            it('should read in a file with "cp1255" encoding', function(done) {
                checkReadWithEncoding("cp1255", "test", done);
            });

            it('should read in a file with "cp1256" encoding', function(done) {
                checkReadWithEncoding("cp1256", "test", done);
            });

            it('should read in a file with "cp1257" encoding', function(done) {
                checkReadWithEncoding("cp1257", "test", done);
            });

            it('should read in a file with "cp1258" encoding', function(done) {
                checkReadWithEncoding("cp1258", "test", done);
            });

            // IBM
            it('should read in a file with "cp437" encoding', function(done) {
                checkReadWithEncoding("cp437", "test", done);
            });

            it('should read in a file with "cp737" encoding', function(done) {
                checkReadWithEncoding("cp737", "test", done);
            });

            it('should read in a file with "cp775" encoding', function(done) {
                checkReadWithEncoding("cp775", "test", done);
            });

            it('should read in a file with "cp808" encoding', function(done) {
                checkReadWithEncoding("cp808", "test", done);
            });

            it('should read in a file with "cp850" encoding', function(done) {
                checkReadWithEncoding("cp850", "test", done);
            });

            it('should read in a file with "cp852" encoding', function(done) {
                checkReadWithEncoding("cp852", "test", done);
            });

            it('should read in a file with "cp855" encoding', function(done) {
                checkReadWithEncoding("cp855", "test", done);
            });

            it('should read in a file with "cp856" encoding', function(done) {
                checkReadWithEncoding("cp856", "test", done);
            });

            it('should read in a file with "cp857" encoding', function(done) {
                checkReadWithEncoding("cp857", "test", done);
            });

            it('should read in a file with "cp858" encoding', function(done) {
                checkReadWithEncoding("cp858", "test", done);
            });

            it('should read in a file with "cp860" encoding', function(done) {
                checkReadWithEncoding("cp860", "test", done);
            });

            it('should read in a file with "cp861" encoding', function(done) {
                checkReadWithEncoding("cp861", "test", done);
            });

            it('should read in a file with "cp866" encoding', function(done) {
                checkReadWithEncoding("cp866", "test", done);
            });

            it('should read in a file with "cp869" encoding', function(done) {
                checkReadWithEncoding("cp869", "test", done);
            });

            it('should read in a file with "cp922" encoding', function(done) {
                checkReadWithEncoding("cp922", "test", done);
            });

            it('should read in a file with "cp1046" encoding', function(done) {
                checkReadWithEncoding("cp1046", "test", done);
            });

            it('should read in a file with "cp1124" encoding', function(done) {
                checkReadWithEncoding("cp1124", "test", done);
            });

            it('should read in a file with "cp1125" encoding', function(done) {
                checkReadWithEncoding("cp1125", "test", done);
            });

            it('should read in a file with "cp1129" encoding', function(done) {
                checkReadWithEncoding("cp1129", "test", done);
            });

            it('should read in a file with "cp1133" encoding', function(done) {
                checkReadWithEncoding("cp1133", "test", done);
            });

            it('should read in a file with "cp1161" encoding', function(done) {
                checkReadWithEncoding("cp1161", "test", done);
            });

            it('should read in a file with "cp1162" encoding', function(done) {
                checkReadWithEncoding("cp1162", "test", done);
            });

            it('should read in a file with "cp1163" encoding', function(done) {
                checkReadWithEncoding("cp1163", "test", done);
            });

            // Mac
            it('should read in a file with "maccroatian" encoding', function(done) {
                checkReadWithEncoding("maccroatian", "test", done);
            });

            it('should read in a file with "maccyrillic" encoding', function(done) {
                checkReadWithEncoding("maccyrillic", "test", done);
            });

            it('should read in a file with "macgreek" encoding', function(done) {
                checkReadWithEncoding("macgreek", "test", done);
            });

            it('should read in a file with "maciceland" encoding', function(done) {
                checkReadWithEncoding("maciceland", "test", done);
            });

            it('should read in a file with "macroman" encoding', function(done) {
                checkReadWithEncoding("macroman", "test", done);
            });

            it('should read in a file with "macromania" encoding', function(done) {
                checkReadWithEncoding("macromania", "test", done);
            });

            it('should read in a file with "macthai" encoding', function(done) {
                checkReadWithEncoding("macthai", "test", done);
            });

            it('should read in a file with "macturkish" encoding', function(done) {
                checkReadWithEncoding("macturkish", "test", done);
            });

            it('should read in a file with "macukraine" encoding', function(done) {
                checkReadWithEncoding("macukraine", "test", done);
            });

            it('should read in a file with "maccenteuro" encoding', function(done) {
                checkReadWithEncoding("maccenteuro", "test", done);
            });

            it('should read in a file with "macintosh" encoding', function(done) {
                checkReadWithEncoding("macintosh", "test", done);
            });

            // KOI8
            it('should read in a file with "koi8-r" encoding', function(done) {
                checkReadWithEncoding("koi8-r", "test", done);
            });

            it('should read in a file with "koi8-u" encoding', function(done) {
                checkReadWithEncoding("koi8-u", "test", done);
            });

            it('should read in a file with "koi8-ru" encoding', function(done) {
                checkReadWithEncoding("koi8-ru", "test", done);
            });

            it('should read in a file with "koi8-t" encoding', function(done) {
                checkReadWithEncoding("koi8-t", "test", done);
            });

            // Misc
            it('should read in a file with "armscii8" encoding', function(done) {
                checkReadWithEncoding("armscii8", "test", done);
            });

            it('should read in a file with "rk1048" encoding', function(done) {
                checkReadWithEncoding("rk1048", "test", done);
            });

            it('should read in a file with "tcvn" encoding', function(done) {
                checkReadWithEncoding("tcvn", "test", done);
            });

            it('should read in a file with "georgianacademy" encoding', function(done) {
                checkReadWithEncoding("georgianacademy", "test", done);
            });

            it('should read in a file with "georgianps" encoding', function(done) {
                checkReadWithEncoding("georgianps", "test", done);
            });

            it('should read in a file with "pt154" encoding', function(done) {
                checkReadWithEncoding("pt154", "test", done);
            });

            it('should read in a file with "viscii" encoding', function(done) {
                checkReadWithEncoding("viscii", "test", done);
            });

            it('should read in a file with "iso646cn" encoding', function(done) {
                checkReadWithEncoding("iso646cn", "test", done);
            });

            it('should read in a file with "iso646jp" encoding', function(done) {
                checkReadWithEncoding("iso646jp", "test", done);
            });

            it('should read in a file with "hproman8" encoding', function(done) {
                checkReadWithEncoding("hproman8", "test", done);
            });

            it('should read in a file with "tis620" encoding', function(done) {
                checkReadWithEncoding("tis620", "test", done);
            });

        });

    });
});
