/**
 * Copyright 2013, 2014 IBM Corp.
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

var localfilesystem = require("../../../red/storage/localfilesystem");

describe('LocalFileSystem', function() {
    var userDir = path.join(__dirname,".testUserHome");
    var testFlow = [{"type":"tab","id":"d8be2a6d.2741d8","label":"Sheet 1"}];
    beforeEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });
    afterEach(function(done) {
        fs.remove(userDir,done);
    });

    it('should initialise the user directory',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(path.join(userDir,"lib")).should.be.true;
            fs.existsSync(path.join(userDir,"lib",'flows')).should.be.true;
            done();
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should handle missing flow file',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            fs.existsSync(flowFilePath).should.be.false;
            localfilesystem.getFlows().then(function(flows) {
                flows.should.eql([]);
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should save flows to the default file',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");
            fs.existsSync(flowFilePath).should.be.false;
            fs.existsSync(flowFileBackupPath).should.be.false;
            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(flowFilePath).should.be.true;
                fs.existsSync(flowFileBackupPath).should.be.false;
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should save flows to the specified file',function(done) {
        var defaultFlowFile = 'flows_'+require('os').hostname()+'.json';
        var defaultFlowFilePath = path.join(userDir,defaultFlowFile);
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath}).then(function() {
            fs.existsSync(defaultFlowFilePath).should.be.false;
            fs.existsSync(flowFilePath).should.be.false;

            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(defaultFlowFilePath).should.be.false;
                fs.existsSync(flowFilePath).should.be.true;
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should backup the flows file', function(done) {
        var defaultFlowFile = 'flows_'+require('os').hostname()+'.json';
        var defaultFlowFilePath = path.join(userDir,defaultFlowFile);
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath}).then(function() {
            fs.existsSync(defaultFlowFilePath).should.be.false;
            fs.existsSync(flowFilePath).should.be.false;
            fs.existsSync(flowFileBackupPath).should.be.false;

            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(flowFileBackupPath).should.be.false;
                fs.existsSync(defaultFlowFilePath).should.be.false;
                fs.existsSync(flowFilePath).should.be.true;
                var content = fs.readFileSync(flowFilePath,'utf8');
                var testFlow2 = [{"type":"tab","id":"bc5672ad.2741d8","label":"Sheet 2"}];
                
                localfilesystem.saveFlows(testFlow2).then(function() {
                    fs.existsSync(flowFileBackupPath).should.be.true;
                    fs.existsSync(defaultFlowFilePath).should.be.false;
                    fs.existsSync(flowFilePath).should.be.true;
                    var backupContent = fs.readFileSync(flowFileBackupPath,'utf8');
                    content.should.equal(backupContent);
                    var content2 = fs.readFileSync(flowFilePath,'utf8');
                    content2.should.not.equal(backupContent);
                    done();
                    
                }).otherwise(function(err) {
                    done(err);
                });
                
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
            
            
    });
    
    it('should handle missing credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");
        localfilesystem.init({userDir:userDir, flowFile:flowFilePath}).then(function() {
            fs.existsSync(credFile).should.be.false;

            localfilesystem.getCredentials().then(function(creds) {
                creds.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should handle credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath}).then(function() {

            fs.existsSync(credFile).should.be.false;

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true;
                localfilesystem.getCredentials().then(function(creds) {
                    creds.should.eql(credentials);
                    done();
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return an empty list of library flows',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.getAllFlows().then(function(flows) {
                flows.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return a valid list of library flows',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            var flowLib = path.join(userDir,"lib","flows");
            fs.closeSync(fs.openSync(path.join(flowLib,"A.json"),"w"));
            fs.closeSync(fs.openSync(path.join(flowLib,"B.json"),"w"));
            fs.mkdirSync(path.join(flowLib,"C"));
            fs.closeSync(fs.openSync(path.join(flowLib,"C","D.json"),"w"));
            var testFlowsList = {"d":{"C":{"f":["D"]}},"f":["A","B"]};

            localfilesystem.getAllFlows().then(function(flows) {
                flows.should.eql(testFlowsList);
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should fail a non-existent flow', function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.getFlow("a/b/c.json").then(function(flow) {
                should.fail(flow,"No flow","Flow found");
            }).otherwise(function(err) {
                // err should be null, so this will pass
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return a flow',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            var testflowString = JSON.stringify(testFlow);
            localfilesystem.saveFlow("a/b/c/d.json",testflowString).then(function() {
                localfilesystem.getFlow("a/b/c/d.json").then(function(flow) {
                    flow.should.eql(testflowString);
                    done();
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return an empty list of library objects',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.getLibraryEntry('object','').then(function(flows) {
                flows.should.eql([]);
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return an error for a non-existent library object',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.getLibraryEntry('object','A/B').then(function(flows) {
                should.fail(null,null,"non-existent flow");
            }).otherwise(function(err) {
                should.exist(err);
                done();
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    function createObjectLibrary() {
        var objLib = path.join(userDir,"lib","object");
        fs.mkdirSync(objLib);
        fs.mkdirSync(path.join(objLib,"A"));
        fs.mkdirSync(path.join(objLib,"B"));
        fs.mkdirSync(path.join(objLib,"B","C"));
        fs.writeFileSync(path.join(objLib,"file1.js"),"// abc: def\n// not a metaline \n\n Hi",'utf8');
        fs.writeFileSync(path.join(objLib,"B","file2.js"),"// ghi: jkl\n// not a metaline \n\n Hi",'utf8');
    }

    it('should return a directory listing of library objects',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            createObjectLibrary();

            localfilesystem.getLibraryEntry('object','').then(function(flows) {
                flows.should.eql([ 'A', 'B', { abc: 'def', fn: 'file1.js' } ]);
                localfilesystem.getLibraryEntry('object','B').then(function(flows) {
                    flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' } ]);
                    localfilesystem.getLibraryEntry('object','B/C').then(function(flows) {
                        flows.should.eql([]);
                        done();
                    }).otherwise(function(err) {
                        done(err);
                    });
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return a library object',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            createObjectLibrary();
            localfilesystem.getLibraryEntry('object','B/file2.js').then(function(body) {
                body.should.eql("// not a metaline \n\n Hi");
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should return a newly saved library object',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            createObjectLibrary();
            localfilesystem.getLibraryEntry('object','B').then(function(flows) {
                flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' } ]);
                localfilesystem.saveLibraryEntry('object','B/D/file3.js',{mno:'pqr'},"// another non meta line\n\n Hi There").then(function() {
                    localfilesystem.getLibraryEntry('object','B/D').then(function(flows) {
                        flows.should.eql([ { mno: 'pqr', fn: 'file3.js' } ]);
                        localfilesystem.getLibraryEntry('object','B/D/file3.js').then(function(body) {
                            body.should.eql("// another non meta line\n\n Hi There");
                            done();
                        }).otherwise(function(err) {
                            done(err);
                        });
                    }).otherwise(function(err) {
                        done(err);
                    });
                }).otherwise(function(err) {
                    done(err);
                });
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

});
