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

var fileNode = require("../../../../nodes/core/storage/50-file.js");
var helper = require("../../helper.js");

var fsWatcher; // variable used to store the fsWatcher object returned by watchFile(), it needs to be closed when watching is stopped

/**
 * A watcher that watches a directory/file for changes. WARNING: you need to manually close fsWatcher!
 * TODO: the API is experimental
 * @param filePath Fully qualified path of the file or directory watched for changes
 * @param anEvent Specify the event we want the callback to be called for ('change' => modified, 'rename' => created/deleted)
 * @param callback the function to call when the particular event on the file occurs
 */
function watchFile(filePath, anEvent, callback) {
    var fs = require('fs');
    var path = require('path');
    var fileDir = path.dirname(filePath);
    var fileName = path.basename(filePath);

    fsWatcher = fs.watch(fileDir, function(event, who) {
        if (event === anEvent && who === fileName) {
            callback();
        }
    });
}

describe('FileNode', function() {
    
    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var fileToWriteTo = path.join(resourcesDir, "50-file-test-file-write.txt");
    
    beforeEach(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        if(fsWatcher) {
            fsWatcher.close();
        }
        fs.exists(fileToWriteTo, function(exists) {
            if(exists) {
                fs.unlinkSync(fileToWriteTo);
            }
        });
        helper.unload();
        helper.stopServer(done);
    });
    
    after(function(done) {
        fs.exists(fileToWriteTo, function(exists) {
            if(!exists) {
                fs.writeFile(fileToWriteTo, "", null, done);
            } else {
                done();
            }
        });
    });
    
    it('should be loaded', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:true, overwriteFile:true, wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.should.have.property('name', 'fileNode');
            done();
        });
    });
    
    var firstInput = "Write me to the file please!";
    var secondInput = "Second input!";
    
    function runDoubleWriteTest(fileNode, flow, done, expectedResult1, expectedResult2) {
        helper.load(fileNode, flow, function() {
            var calledDone = false;
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.emit("input", {payload:firstInput});
            watchFile(fileToWriteTo, "change", function() {
                fs.readFile(fileToWriteTo, "UTF-8", function(err, data) {
                    if(err) {
                        done(err);
                    }
                    try {
                        fsWatcher.close();
                        data.should.equal(expectedResult1);
                    }
                    catch (e) {
                        done(e);
                    }
                    fileNode1.emit("input", {payload:secondInput});
                    watchFile(fileToWriteTo, "change", function() {
                        fs.readFile(fileToWriteTo, "UTF-8", function(err, data) {
                            if(err) {
                                done(err);
                            }
                            try {
                                data.should.equal(expectedResult2);
                                if(calledDone === false) {
                                    calledDone = true;
                                    done();
                                }
                            } catch (e) {
                                done(e);
                            }
                        });
                    });
                });
            });
        });
    }
    it('should write to a file', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:true, overwriteFile:true, wires:[]}];
        runDoubleWriteTest(fileNode, flow, done, firstInput + "\n", secondInput + "\n");
    });
    
    it('doesn\'t overwrite file', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:true, overwriteFile:false, wires:[]}];
        runDoubleWriteTest(fileNode, flow, done, firstInput + "\n", firstInput + "\n" + secondInput + "\n");
    });
    
    function runSingleWriteTest(fileNode, flow, done, aPayload, expectedResult) {
        helper.load(fileNode, flow, function() {
            var calledDone = false;
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.emit("input", {payload:aPayload});
            watchFile(fileToWriteTo, "change", function() {
                fs.readFile(fileToWriteTo, "UTF-8", function(err, data) {
                    if(err) {
                        done(err);
                    }
                    try {
                        data.should.equal(expectedResult);
                        if(calledDone === false) {
                            calledDone = true;
                            done();
                        }
                    } catch (e) {
                        done(e);
                    }
                });
            });
        });
    }

    it('doesn\'t append newline', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:false, overwriteFile:true, wires:[]}];
        var payload = "Write me to the file please!";
        runSingleWriteTest(fileNode, flow, done, payload, payload);

    });
    
    it('handles booleans', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:true, overwriteFile:false, wires:[]}];
        var payload = true;
        runSingleWriteTest(fileNode, flow, done, payload, "true\n");
    });
    
    it('handles objects', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:true, overwriteFile:false, wires:[]}];
        var payload = [1, 2, 3];
        runSingleWriteTest(fileNode, flow, done, payload, "[1,2,3]\n");
    });
});

describe('FileReaderNode', function() {
    
    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var fileToRead = path.join(resourcesDir, "50-file-test-file-read.txt");
    
    var sinon = require('sinon');
    
    var messageInFile = "Read me!\nRead me line 2\n";

    beforeEach(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });
    
    it('should be loaded', function(done) {
        var flow = [{id:"fileNode1", type:"file in", name: "fileNode", filename:fileToRead, format:"utf8", wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.should.have.property('name', 'fileNode');
            done();
        });
    });
    
    it('reads a file', function(done) {
        var flow = [{id:"fileNode1", type:"file in", name: "fileNode", "filename":fileToRead, format:"utf8", "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            var helperNode1 = helper.getNode("helperNode1");
            fileNode1.emit("input", {payload:""});
            helperNode1.on("input", function(msg) {
                msg.filename.should.equal(fileToRead);
                msg.payload.should.equal(messageInFile);
            });
            done();
        });
    });
    
    it('reads a file as a buffer', function(done) {
        var flow = [{id:"fileNode1", type:"file in", name: "fileNode", "filename":fileToRead, "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            var helperNode1 = helper.getNode("helperNode1");
            fileNode1.emit("input", {payload:""});
            helperNode1.on("input", function(msg) {
                msg.filename.should.equal(fileToRead);
                var bufferToString = msg.payload.toString("utf8");
                bufferToString.should.equal(messageInFile);
            });
            done();
        });
    });
    
    it('reports if filename is not specified', function(done) {
        var flow = [{id:"fileNode1", type:"file in", name: "fileNode", format:"utf8", "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            var helperNode1 = helper.getNode("helperNode1");
            sinon.stub(fileNode1, 'warn', function(warning){
                if(warning === "No filename specified") {
                    done();
                }
            });
            fileNode1.emit("input", {payload:""});
        });
    });
});

describe('FileNode', function() {
    
    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var fileToWriteTo = path.join(resourcesDir, "50-file-test-file-write.txt");
    
    var sinon = require('sinon');
    
    beforeEach(function(done) {
        fs.chmodSync(fileToWriteTo, "000");
        helper.startServer(done);
    });
    
    afterEach(function(done) { // no need to clean up the written file, nothing written
        fs.chmodSync(fileToWriteTo, "755");
        helper.unload();
        helper.stopServer(done);
    });
    
    it('reports I/O problems at file write', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:false, overwriteFile:true, wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.emit("input", {payload:"You ain't writin' me nowhere!!!"});
            
            sinon.stub(fileNode1, 'warn', function(warning){
                try {
                    warning.should.containEql("EACCES");
                    done();
                } catch (e) {
                    done(e);
                }
              });
            
        });
    });
    
    it('reports I/O problems at file append', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", filename:fileToWriteTo, appendNewline:false, overwriteFile:false, wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            fileNode1.emit("input", {payload:"You ain't writin' me nowhere!!!"});
            
            sinon.stub(fileNode1, 'warn', function(warning){
                if(warning.indexOf("EACCES" > -1)) {
                    done();
                }
            });
            
        });
    });
    
    it('reports if filename is not specified', function(done) {
        var flow = [{id:"fileNode1", type:"file", name: "fileNode", appendNewline:false, overwriteFile:false, wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            
            sinon.stub(fileNode1, 'warn', function(warning){
                if(warning === "No filename specified") {
                    done();
                }
            });
            
            fileNode1.emit("input", {payload:"You ain't writin' me nowhere!!!"});
        });
    });
});

describe('FileReaderNode', function() {
    
    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var fileToRead = path.join(resourcesDir, "50-file-test-file-read.txt");

    beforeEach(function(done) {
        fs.chmodSync(fileToRead, "000");
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        fs.chmodSync(fileToRead, "755");
        helper.unload();
        helper.stopServer(done);
    });
    
    it('deals with I/O errors when reading file', function(done) {
        var flow = [{id:"fileNode1", type:"file in", name: "fileNode", "filename":fileToRead, format:"utf8", "wires":[["helperNode1"]]},
                    {id:"helperNode1", type:"helper", wires:[]}];
        helper.load(fileNode, flow, function() {
            var fileNode1 = helper.getNode("fileNode1");
            var helperNode1 = helper.getNode("helperNode1");
            fileNode1.emit("input", {payload:""});
            helperNode1.on("input", function(msg) {
                try {
                    msg.error.code.should.equal("EACCES");
                    msg.error.path.should.equal(fileToRead);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
