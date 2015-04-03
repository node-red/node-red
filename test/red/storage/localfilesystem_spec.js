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
    
    
    it('should set userDir to NRH is .config.json present',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        fs.mkdirSync(process.env.NODE_RED_HOME);
        fs.writeFileSync(path.join(process.env.NODE_RED_HOME,".config.json"),"{}","utf8");
        var settings = {};
        localfilesystem.init(settings).then(function() {
            try {
                fs.existsSync(path.join(process.env.NODE_RED_HOME,"lib")).should.be.true;
                fs.existsSync(path.join(process.env.NODE_RED_HOME,"lib",'flows')).should.be.true;
                settings.userDir.should.equal(process.env.NODE_RED_HOME);
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
            }
        }).otherwise(function(err) {
            done(err);
        });
    });
    
    it('should set userDir to HOME/.node-red',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        var oldHOME = process.env.HOME;
        process.env.HOME = path.join(userDir,"HOME");
        
        fs.mkdirSync(process.env.HOME);
        var settings = {};
        localfilesystem.init(settings).then(function() {
            try {
                fs.existsSync(path.join(process.env.HOME,".node-red","lib")).should.be.true;
                fs.existsSync(path.join(process.env.HOME,".node-red","lib",'flows')).should.be.true;
                settings.userDir.should.equal(path.join(process.env.HOME,".node-red"));
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
                process.env.HOME = oldHOME;
            }
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
    
    it('should format the flows file when flowFilePretty specified',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,flowFilePretty:true}).then(function() {
            localfilesystem.saveFlows(testFlow).then(function() {
                var content = fs.readFileSync(flowFilePath,"utf8");
                content.split("\n").length.should.be.above(1);
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

    
    it('should backup existing credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");
        var credFileBackup = path.join(userDir,".test_cred.json.backup");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath}).then(function() {

            fs.writeFileSync(credFile,"{}","utf8");
            
            fs.existsSync(credFile).should.be.true;
            fs.existsSync(credFileBackup).should.be.false;

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true;
                fs.existsSync(credFileBackup).should.be.true;
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });
    
    
    it('should format the creds file when flowFilePretty specified',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath, flowFilePretty:true}).then(function() {

            fs.existsSync(credFile).should.be.false;

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true;
                var content = fs.readFileSync(credFile,"utf8");
                content.split("\n").length.should.be.above(1);
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
    
    it('should handle non-existent settings', function(done) {
        var settingsFile = path.join(userDir,".settings.json");

        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(settingsFile).should.be.false;
            localfilesystem.getSettings().then(function(settings) {
                settings.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });
    
    it('should handle corrupt settings', function(done) {
        var settingsFile = path.join(userDir,".config.json");
        fs.writeFileSync(settingsFile,"[This is not json","utf8");
        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(settingsFile).should.be.true;
            localfilesystem.getSettings().then(function(settings) {
                settings.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });
    
    it('should handle settings', function(done) {
        var settingsFile = path.join(userDir,".config.json");

        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(settingsFile).should.be.false;

            var settings = {"abc":{"type":"creds"}};

            localfilesystem.saveSettings(settings).then(function() {
                fs.existsSync(settingsFile).should.be.true;
                localfilesystem.getSettings().then(function(_settings) {
                    _settings.should.eql(settings);
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
    
    it('should handle non-existent sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");

        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(sessionsFile).should.be.false;
            localfilesystem.getSessions().then(function(sessions) {
                sessions.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });
        
    it('should handle corrupt sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");
        fs.writeFileSync(sessionsFile,"[This is not json","utf8");
        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(sessionsFile).should.be.true;
            localfilesystem.getSessions().then(function(sessions) {
                sessions.should.eql({});
                done();
            }).otherwise(function(err) {
                done(err);
            });
        }).otherwise(function(err) {
            done(err);
        });
    });

    it('should handle sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");

        localfilesystem.init({userDir:userDir}).then(function() {
            fs.existsSync(sessionsFile).should.be.false;

            var sessions = {"abc":{"type":"creds"}};

            localfilesystem.saveSessions(sessions).then(function() {
                fs.existsSync(sessionsFile).should.be.true;
                localfilesystem.getSessions().then(function(_sessions) {
                    _sessions.should.eql(sessions);
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

    function createObjectLibrary(type) {
        type = type ||"object";
        var objLib = path.join(userDir,"lib",type);
        try {
            fs.mkdirSync(objLib);
        } catch(err) {
        }
        fs.mkdirSync(path.join(objLib,"A"));
        fs.mkdirSync(path.join(objLib,"B"));
        fs.mkdirSync(path.join(objLib,"B","C"));
        fs.writeFileSync(path.join(objLib,"file1.js"),"// abc: def\n// not a metaline \n\n Hi",'utf8');
        fs.writeFileSync(path.join(objLib,"B","file2.js"),"// ghi: jkl\n// not a metaline \n\n Hi",'utf8');
        fs.writeFileSync(path.join(objLib,"B","flow.json"),"Hi",'utf8');
    }

    it('should return a directory listing of library objects',function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            createObjectLibrary();

            localfilesystem.getLibraryEntry('object','').then(function(flows) {
                flows.should.eql([ 'A', 'B', { abc: 'def', fn: 'file1.js' } ]);
                localfilesystem.getLibraryEntry('object','B').then(function(flows) {
                    flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' }, { fn: 'flow.json' } ]);
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

    it('should load a flow library object with .json unspecified', function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            createObjectLibrary("flows");
            localfilesystem.getLibraryEntry('flows','B/flow').then(function(flows) {
                flows.should.eql("Hi");
                done();
            }).otherwise(function(err) {
                done(err);
            });
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
                flows.should.eql([ 'C', { ghi: 'jkl', fn: 'file2.js' }, {fn:'flow.json'} ]);
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
