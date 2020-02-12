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
var fs = require('fs-extra');
var path = require('path');
var NR_TEST_UTILS = require("nr-test-utils");

var localfilesystemLibrary = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/library");

describe('storage/localfilesystem/library', function() {
    var userDir = path.join(__dirname,".testUserHome");
    beforeEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });
    afterEach(function(done) {
        fs.remove(userDir,done);
    });

    it('should return an empty list of library objects',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            localfilesystemLibrary.getLibraryEntry('object','').then(function(flows) {
                flows.should.eql([]);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return an empty list of library objects (path=/)',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            localfilesystemLibrary.getLibraryEntry('object','/').then(function(flows) {
                flows.should.eql([]);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return an error for a non-existent library object',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            localfilesystemLibrary.getLibraryEntry('object','A/B').then(function(flows) {
                should.fail(null,null,"non-existent flow");
            }).catch(function(err) {
                should.exist(err);
                done();
            });
        }).catch(function(err) {
            done(err);
        });
    });

    function createObjectLibrary(type) {
        type = type || "object";
        var objLib = path.join(userDir, "lib", type);
        try {
            fs.mkdirSync(objLib);
        } catch (err) {
        }
        fs.mkdirSync(path.join(objLib, "A"));
        fs.mkdirSync(path.join(objLib, "B"));
        fs.mkdirSync(path.join(objLib, "B", "C"));
        fs.mkdirSync(path.join(objLib, "D"));
        if (type === "functions" || type === "object") {
            fs.writeFileSync(path.join(objLib, "file1.js"), "// abc: def\n// not a metaline \n\n Hi", 'utf8');
            fs.writeFileSync(path.join(objLib, "B", "file2.js"), "// ghi: jkl\n// not a metaline \n\n Hi", 'utf8');
            fs.writeFileSync(path.join(objLib, "D", "file3.js"), "// mno: 日本語テスト\n\nこんにちわ", 'utf8');
        }
        if (type === "flows" || type === "object") {
            fs.writeFileSync(path.join(objLib, "B", "flow.json"), "Hi", 'utf8');
        }
    }

    it('should return a directory listing of library objects', function (done) {
        localfilesystemLibrary.init({userDir: userDir}).then(function () {
            createObjectLibrary();

            localfilesystemLibrary.getLibraryEntry('object', '').then(function (flows) {
                flows.should.eql([ 'A', 'B', 'D', { abc: 'def', fn: 'file1.js' }]);
                localfilesystemLibrary.getLibraryEntry('object', 'B').then(function (flows) {
                    flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' }, { fn: 'flow.json' }]);
                    localfilesystemLibrary.getLibraryEntry('object', 'B/C').then(function (flows) {
                        flows.should.eql([]);
                        localfilesystemLibrary.getLibraryEntry('object', 'D').then(function (flows) {
                            flows.should.eql([{ mno: '日本語テスト', fn: 'file3.js' }]);
                            done();
                        }).catch(function (err) {
                            done(err);
                        });
                    }).catch(function (err) {
                        done(err);
                    });
                }).catch(function (err) {
                    done(err);
                });
            }).catch(function (err) {
                done(err);
            });
        }).catch(function (err) {
            done(err);
        });
    });

    it('should load a flow library object with .json unspecified', function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            createObjectLibrary("flows");
            localfilesystemLibrary.getLibraryEntry('flows','B/flow').then(function(flows) {
                flows.should.eql("Hi");
                done();
            }).catch(function(err) {
                done(err);
            });
        });

    });

    it('should return a library object',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            createObjectLibrary();
            localfilesystemLibrary.getLibraryEntry('object','B/file2.js').then(function(body) {
                body.should.eql("// not a metaline \n\n Hi");
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return a newly saved library function',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            createObjectLibrary("functions");
            localfilesystemLibrary.getLibraryEntry('functions','B').then(function(flows) {
                flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' } ]);
                var ft = path.join("B","D","file3.js");
                localfilesystemLibrary.saveLibraryEntry('functions',ft,{mno:'pqr'},"// another non meta line\n\n Hi There").then(function() {
                    setTimeout(function() {
                        localfilesystemLibrary.getLibraryEntry('functions',path.join("B","D")).then(function(flows) {
                            flows.should.eql([ { mno: 'pqr', fn: 'file3.js' } ]);
                            localfilesystemLibrary.getLibraryEntry('functions',ft).then(function(body) {
                                body.should.eql("// another non meta line\n\n Hi There");
                                done();
                            }).catch(function(err) {
                                done(err);
                            });
                        }).catch(function(err) {
                            done(err);
                        })
                    }, 50);
                }).catch(function(err) {
                    done(err);
                });
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return a newly saved library flow',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            createObjectLibrary("flows");
            localfilesystemLibrary.getLibraryEntry('flows','B').then(function(flows) {
                flows.should.eql([ 'C', {fn:'flow.json'} ]);
                var ft = path.join("B","D","file3");
                localfilesystemLibrary.saveLibraryEntry('flows',ft,{mno:'pqr'},"Hi").then(function() {
                    setTimeout(function() {
                        localfilesystemLibrary.getLibraryEntry('flows',path.join("B","D")).then(function(flows) {
                            flows.should.eql([ { mno: 'pqr', fn: 'file3.json' } ]);
                            localfilesystemLibrary.getLibraryEntry('flows',ft+".json").then(function(body) {
                                body.should.eql("Hi");
                                done();
                            }).catch(function(err) {
                                done(err);
                            });
                        }).catch(function(err) {
                            done(err);
                        })
                    }, 50);
                }).catch(function(err) {
                    done(err);
                });
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should return a newly saved library flow (multi-byte character)',function(done) {
        localfilesystemLibrary.init({userDir:userDir}).then(function() {
            createObjectLibrary("flows");
            localfilesystemLibrary.getLibraryEntry('flows','B').then(function(flows) {
                flows.should.eql([ 'C', {fn:'flow.json'} ]);
                var ft = path.join("B","D","file4");
                localfilesystemLibrary.saveLibraryEntry('flows',ft,{mno:'pqr'},"こんにちわこんにちわこんにちわ").then(function() {
                    setTimeout(function() {
                        localfilesystemLibrary.getLibraryEntry('flows',path.join("B","D")).then(function(flows) {
                            flows.should.eql([ { mno: 'pqr', fn: 'file4.json' } ]);
                            localfilesystemLibrary.getLibraryEntry('flows',ft+".json").then(function(body) {
                                body.should.eql("こんにちわこんにちわこんにちわ");
                                done();
                            }).catch(function(err) {
                                done(err);
                            });
                        }).catch(function(err) {
                            done(err);
                        })
                    }, 50);
                }).catch(function(err) {
                    done(err);
                });
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });
});
