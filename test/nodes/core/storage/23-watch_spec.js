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

var fs = require("fs-extra");
var path = require("path");
var should = require("should");
var helper = require("node-red-node-test-helper");
var watchNode = require("nr-test-utils").require("@node-red/nodes/core/storage/23-watch.js");


describe('watch Node', function() {
    this.timeout(5000);

    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var baseDir = path.join(resourcesDir, "23-watch-test-dir");
    var count = 0;

    function prepareDir() {
        var dirToWatch = path.join(baseDir, "base"+count);
        fs.mkdirSync(dirToWatch);
        count++;
        return {
            dirToWatch:dirToWatch,
            file0ToWatch:path.join(dirToWatch, "file0.txt"),
            file1ToWatch:path.join(dirToWatch, "file1.txt"),
            subDirToWatch:path.join(dirToWatch, "subdir"),
            file2ToWatch:path.join(dirToWatch, "subdir", "file2.txt")
        }
    }

    function wait(msec, func) {
        setTimeout(func, msec);
    }

    before(function(done) {
        fs.ensureDirSync(baseDir);
        done();
    });

    after(function(done) {
        fs.removeSync(baseDir);
        done();
    });

    afterEach(function(done) {
        helper.unload();
        done();
    });

    function testWatch(flow, change_func, results, done) {
        var processed = {};
        helper.load(watchNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            var len = Object.keys(results).length;
            n2.on("input", function(msg) {
                try {
                    // console.log(msg);
                    msg.should.have.property('file');

                    var file = msg.file;
                    if (file in processed) {
                        // multiple messages come in rare case
                        return;
                    }
                    processed[file] = true;
                    if (file === 'subdir') {
                        // On OSX, we get a change event on subdir when a file inside changes.
                        // On Travis, we don't. *sigh*
                        return;
                    }
                    (file in results).should.be.true();

                    var result = results[file];
                    msg.should.have.property('payload', result.payload);
                    msg.should.have.property('type', result.type);
                    if('size' in result) {
                        msg.should.have.property('size', result.size);
                    }
                    count++;
                    if(count === len) {
                        n1.close();
                        // wait for close
                        wait(100, done);
                    }
                }catch(err) {
                    done(err);
                }
            });
            // wait for preparation
            wait(500, change_func);
        });
    }

    it('should watch a file to be changed', function(done) {
        var files = prepareDir();
        fs.writeFileSync(files.file0ToWatch, '');
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files.file0ToWatch, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : files.file0ToWatch,
                'topic': files.file0ToWatch,
                'type': 'file',
                'size': 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(files.file0ToWatch, "ABCDE");
        }, results, done);
    });

    it('should watch multiple files to be changed', function(done) {
        var files = prepareDir();
        fs.writeFileSync(files.file0ToWatch, '');
        fs.writeFileSync(files.file1ToWatch, '');
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files.file0ToWatch +","+files.file1ToWatch, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : files.file0ToWatch,
                'topic': files.file0ToWatch,
                'type': 'file'//,
                // 'size': 5
            },
            'file1.txt' : {
                'payload' : files.file1ToWatch,
                'topic': files.file1ToWatch,
                'type': 'file'//,
                // 'size': 3
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(files.file0ToWatch, "ABCDE");
            fs.appendFileSync(files.file1ToWatch, "123");
        }, results, done);
    });

    it('should watch attribute of a file to be changed', function(done) {
        var files = prepareDir();
        fs.writeFileSync(files.file0ToWatch, '');
        fs.chmodSync(files.file0ToWatch, 0o444);
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files.file0ToWatch, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : files.file0ToWatch,
                'topic': files.file0ToWatch,
                'type': 'file'//,
                // 'size': 0
            }
        };
        testWatch(flow, function() {
            fs.chmodSync(files.file0ToWatch, 0o777);
        }, results, done);
    });

    it('should watch a file in a directory to be changed', function(done) {
        var files = prepareDir();
        fs.writeFileSync(files.file0ToWatch, '');
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files.dirToWatch, recursive: true,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : files.file0ToWatch,
                'topic': files.file0ToWatch,
                'type': 'file'//,
                // 'size': 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(files.file0ToWatch, "ABCDE");
        }, results, done);
    });

    it('should watch a sub directory in a directory to be changed', function(done) {
        var files = prepareDir();
        fs.mkdirSync(files.subDirToWatch);
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files.dirToWatch, recursive: true,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file2.txt': {
                payload: files.file2ToWatch,
                type: 'file'//,
                // size: 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(files.file2ToWatch, "ABCDE");
        }, results, done);
    });

});
