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

var fs = require("fs");
var path = require("path");
var should = require("should");
var helper = require("../../helper.js");
var watchNode = require("../../../../nodes/core/io/23-watch.js");


describe('watch Node', function() {
    this.timeout(5000);

    var resourcesDir = path.join(__dirname,"..","..","..","resources");
    var baseDir = path.join(resourcesDir, "23-watch-test-dir");
    var dirToWatch = undefined;
    var subDirToWatch = undefined;
    var file0ToWatch = undefined;
    var file1ToWatch = undefined;
    var file2ToWatch = undefined;
    var count = 0;

    function prepareDir() {
        dirToWatch = path.join(baseDir, "base"+count);
        file0ToWatch = path.join(dirToWatch, "file0.txt");
        file1ToWatch = path.join(dirToWatch, "file1.txt");
        subDirToWatch = path.join(dirToWatch, "subdir");
        file2ToWatch = path.join(subDirToWatch, "file2.txt");
        fs.mkdirSync(dirToWatch);
        count++;
    }

    function wait(msec, func) {
        setTimeout(func, msec);
    }
    
    function rmdir(dir_path, done) {
        function collect(dir_path, files, dirs) {
            var elems = fs.readdirSync(dir_path);
            elems.forEach(function(elem) {
                var elem_path = path.join(dir_path, elem);
                var stat = fs.lstatSync(elem_path);
                if(stat.isDirectory()) {
                    var r = collect(elem_path, files, dirs);
                    files = r[0];
                    dirs = r[1];
                } else {
                    files.push(elem_path);
                }
            });
            dirs.push(dir_path);
            return [files, dirs];
        }
        function seq(func, list, cont) {
            if(list.length > 0) {
                var elem = list.shift();
                func(elem, function(err) {
                    if(err) {
                        throw err;
                    }
                    seq(func, list, cont);
                });
            }
            else {
                cont();
            }
        }
        var r = collect(dir_path, [], []);
        var files = r[0];
        var dirs = r[1];
        seq(fs.unlink, files,
            function() {
                seq(fs.rmdir, dirs, done);
            });
    }

    before(function(done) {
        fs.mkdirSync(baseDir);
        done();
    });

    after(function(done) {
        rmdir(baseDir, done);
    });

    beforeEach(function(done) {
        prepareDir();
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
                msg.should.have.property('file');

                var file = msg.file;
                if(file in processed) {
                    // multiple messages come in rare case
                    return;
                }
                processed[file] = true;
                (file in results).should.be.true;

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
                    wait(500, done);
                }
            });
            // wait for preparation
            wait(500, change_func);
        });
    }

    it('should watch a file to be changed', function(done) {
        fs.writeFileSync(file0ToWatch, '');
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: file0ToWatch, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : file0ToWatch,
                'topic': file0ToWatch,
                'type': 'file',
                'size': 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(file0ToWatch, "ABCDE");
        }, results, done);
    });

    it('should watch multiple files to be changed', function(done) {
        fs.writeFileSync(file0ToWatch, '');
        fs.writeFileSync(file1ToWatch, '');
        var files = file0ToWatch +","+file1ToWatch;
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: files, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : file0ToWatch,
                'topic': file0ToWatch,
                'type': 'file',
                'size': 5
            },
            'file1.txt' : {
                'payload' : file1ToWatch,
                'topic': file1ToWatch,
                'type': 'file',
                'size': 3
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(file0ToWatch, "ABCDE");
            fs.appendFileSync(file1ToWatch, "123");
        }, results, done);
    });

    it('should watch attribute of a file to be changed', function(done) {
        fs.writeFileSync(file0ToWatch, '');
        fs.chmodSync(file0ToWatch, 0o444);
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: file0ToWatch, recursive: false,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : file0ToWatch,
                'topic': file0ToWatch,
                'type': 'file',
                'size': 0
            }
        };
        testWatch(flow, function() {
            fs.chmodSync(file0ToWatch, 0o777);
        }, results, done);
    });

    it('should watch a file in a directory to be changed', function(done) {
        fs.writeFileSync(file0ToWatch, '');
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: dirToWatch, recursive: true,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file0.txt' : {
                'payload' : file0ToWatch,
                'topic': file0ToWatch,
                'type': 'file',
                'size': 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(file0ToWatch, "ABCDE");
        }, results, done);
    });

    it('should watch a sub directory in a directory to be changed', function(done) {
        fs.mkdirSync(subDirToWatch);
        var flow = [{id:"n1", type:"watch", name: "watch",
                     files: dirToWatch, recursive: true,
                     wires:[["n2"]]},
                    {id:"n2", type:"helper"}];
        var results = {
            'file2.txt': {
                payload: file2ToWatch,
                type: 'file',
                size: 5
            }
        };
        testWatch(flow, function() {
            fs.appendFileSync(file2ToWatch, "ABCDE");
        }, results, done);
    });

});
