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
var sinon = require('sinon');
var NR_TEST_UTILS = require("nr-test-utils");
var process = require("process");

var localfilesystem = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem");
var log = NR_TEST_UTILS.require("@node-red/util").log;

describe('storage/localfilesystem', function() {
    var mockRuntime = {
        log:{
            _:function() { return "placeholder message"},
            info: function() { },
            warn: function() { },
            trace: function() {}
        }
    };
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
        localfilesystem.init({userDir:userDir,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            fs.existsSync(path.join(userDir,"lib")).should.be.true();
            fs.existsSync(path.join(userDir,"lib",'flows')).should.be.true();
            done();
        }).catch(function(err) {
            done(err);
        });
    });


    it('should set userDir to NRH if .config.json presents',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        fs.mkdirSync(process.env.NODE_RED_HOME);
        fs.writeFileSync(path.join(process.env.NODE_RED_HOME,".config.json"),"{}","utf8");
        var settings = {getUserSettings: () => {{}}};
        localfilesystem.init(settings, mockRuntime).then(function() {
            try {
                fs.existsSync(path.join(process.env.NODE_RED_HOME,"lib")).should.be.true();
                fs.existsSync(path.join(process.env.NODE_RED_HOME,"lib",'flows')).should.be.true();
                settings.userDir.should.equal(process.env.NODE_RED_HOME);
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
            }
        }).catch(function(err) {
            done(err);
        });
    });

    it('should set userDir to HOMEPATH/.node-red if .config.json presents',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        var oldHOMEPATH = process.env.HOMEPATH;
        process.env.HOMEPATH = path.join(userDir,"HOMEPATH");
        fs.mkdirSync(process.env.HOMEPATH);
        fs.mkdirSync(path.join(process.env.HOMEPATH,".node-red"));
        fs.writeFileSync(path.join(process.env.HOMEPATH,".node-red",".config.json"),"{}","utf8");
        var settings = {getUserSettings: () => {{}}};
        localfilesystem.init(settings, mockRuntime).then(function() {
            try {
                fs.existsSync(path.join(process.env.HOMEPATH,".node-red","lib")).should.be.true();
                fs.existsSync(path.join(process.env.HOMEPATH,".node-red","lib",'flows')).should.be.true();
                settings.userDir.should.equal(path.join(process.env.HOMEPATH,".node-red"));
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
                process.env.NODE_HOMEPATH = oldHOMEPATH;
            }
        }).catch(function(err) {
            done(err);
        });
    });

    it('should set userDir to HOME/.node-red',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        var oldHOME = process.env.HOME;
        process.env.HOME = path.join(userDir,"HOME");
        var oldHOMEPATH = process.env.HOMEPATH;
        process.env.HOMEPATH = path.join(userDir,"HOMEPATH");

        fs.mkdirSync(process.env.HOME);
        var settings = {getUserSettings: () => {{}}};
        localfilesystem.init(settings, mockRuntime).then(function() {
            try {
                fs.existsSync(path.join(process.env.HOME,".node-red","lib")).should.be.true();
                fs.existsSync(path.join(process.env.HOME,".node-red","lib",'flows')).should.be.true();
                settings.userDir.should.equal(path.join(process.env.HOME,".node-red"));
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
                process.env.HOME = oldHOME;
                process.env.HOMEPATH = oldHOMEPATH;
            }
        }).catch(function(err) {
            done(err);
        });
    });

    it('should set userDir to USERPROFILE/.node-red',function(done) {
        var oldNRH = process.env.NODE_RED_HOME;
        process.env.NODE_RED_HOME = path.join(userDir,"NRH");
        var oldHOME = process.env.HOME;
        process.env.HOME = "";
        var oldHOMEPATH = process.env.HOMEPATH;
        process.env.HOMEPATH = path.join(userDir,"HOMEPATH");
        var oldUSERPROFILE = process.env.USERPROFILE;
        process.env.USERPROFILE = path.join(userDir,"USERPROFILE");

        fs.mkdirSync(process.env.USERPROFILE);
        var settings = {getUserSettings: () => {{}}};
        localfilesystem.init(settings, mockRuntime).then(function() {
            try {
                fs.existsSync(path.join(process.env.USERPROFILE,".node-red","lib")).should.be.true();
                fs.existsSync(path.join(process.env.USERPROFILE,".node-red","lib",'flows')).should.be.true();
                settings.userDir.should.equal(path.join(process.env.USERPROFILE,".node-red"));
                done();
            } catch(err) {
                done(err);
            } finally {
                process.env.NODE_RED_HOME = oldNRH;
                process.env.HOME = oldHOME;
                process.env.HOMEPATH = oldHOMEPATH;
                process.env.USERPROFILE = oldUSERPROFILE;
            }
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle missing flow file',function(done) {
        localfilesystem.init({userDir:userDir,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            fs.existsSync(flowFilePath).should.be.false();
            localfilesystem.getFlows().then(function(flows) {
                flows.should.eql([]);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle empty flow file, no backup',function(done) {
        localfilesystem.init({userDir:userDir,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");
            fs.closeSync(fs.openSync(flowFilePath, 'w'));
            fs.existsSync(flowFilePath).should.be.true();
            localfilesystem.getFlows().then(function(flows) {
                flows.should.eql([]);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle empty flow file, restores backup',function(done) {
        localfilesystem.init({userDir:userDir,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");
            fs.closeSync(fs.openSync(flowFilePath, 'w'));
            fs.existsSync(flowFilePath).should.be.true();
            fs.existsSync(flowFileBackupPath).should.be.false();
            fs.writeFileSync(flowFileBackupPath,JSON.stringify(testFlow));
            fs.existsSync(flowFileBackupPath).should.be.true();
            setTimeout(function() {
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
                }).catch(function(err) {
                    done(err);
                });
            },50);
        }).catch(function(err) {
            done(err);
        });
    });

    it('should save flows to the default file',function(done) {
        localfilesystem.init({userDir:userDir,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            var flowFile = 'flows_'+require('os').hostname()+'.json';
            var flowFilePath = path.join(userDir,flowFile);
            var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");
            fs.existsSync(flowFilePath).should.be.false();
            fs.existsSync(flowFileBackupPath).should.be.false();
            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(flowFilePath).should.be.true();
                fs.existsSync(flowFileBackupPath).should.be.false();
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
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

    it('should save flows to the specified file',function(done) {
        var defaultFlowFile = 'flows_'+require('os').hostname()+'.json';
        var defaultFlowFilePath = path.join(userDir,defaultFlowFile);
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            fs.existsSync(defaultFlowFilePath).should.be.false();
            fs.existsSync(flowFilePath).should.be.false();

            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(defaultFlowFilePath).should.be.false();
                fs.existsSync(flowFilePath).should.be.true();
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
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

    it('should format the flows file when flowFilePretty specified',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,flowFilePretty:true,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            localfilesystem.saveFlows(testFlow).then(function() {
                var content = fs.readFileSync(flowFilePath,"utf8");
                content.split("\n").length.should.be.above(1);
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    done();
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

    it('should fsync the flows file',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        localfilesystem.init({editorTheme:{projects:{enabled:false}},userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            sinon.spy(fs,"fsync");
            localfilesystem.saveFlows(testFlow).then(function() {
                fs.fsync.callCount.should.be.greaterThan(0);
                fs.fsync.restore();
                done();
            }).catch(function(err) {
                fs.fsync.restore();
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should log fsync errors and continue',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            sinon.stub(fs,"fsync").callsFake(function(fd, cb) {
                cb(new Error());
            });
            sinon.spy(log,"warn");
            localfilesystem.saveFlows(testFlow).then(function() {
                fs.fsync.callCount.should.be.greaterThan(0);
                log.warn.restore();
                fs.fsync.callCount.should.be.greaterThan(0);
                fs.fsync.restore();
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should backup the flows file', function(done) {
        var defaultFlowFile = 'flows_'+require('os').hostname()+'.json';
        var defaultFlowFilePath = path.join(userDir,defaultFlowFile);
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var flowFileBackupPath = path.join(userDir,"."+flowFile+".backup");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            fs.existsSync(defaultFlowFilePath).should.be.false();
            fs.existsSync(flowFilePath).should.be.false();
            fs.existsSync(flowFileBackupPath).should.be.false();

            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(flowFileBackupPath).should.be.false();
                fs.existsSync(defaultFlowFilePath).should.be.false();
                fs.existsSync(flowFilePath).should.be.true();
                var content = fs.readFileSync(flowFilePath,'utf8');
                var testFlow2 = [{"type":"tab","id":"bc5672ad.2741d8","label":"Sheet 2"}];

                localfilesystem.saveFlows(testFlow2).then(function() {
                    fs.existsSync(flowFileBackupPath).should.be.true();
                    fs.existsSync(defaultFlowFilePath).should.be.false();
                    fs.existsSync(flowFilePath).should.be.true();
                    var backupContent = fs.readFileSync(flowFileBackupPath,'utf8');
                    content.should.equal(backupContent);
                    var content2 = fs.readFileSync(flowFilePath,'utf8');
                    content2.should.not.equal(backupContent);
                    done();

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

    it('should handle missing credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");
        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {
            fs.existsSync(credFile).should.be.false();

            localfilesystem.getCredentials().then(function(creds) {
                creds.should.eql({});
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {

            fs.existsSync(credFile).should.be.false();

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true();
                localfilesystem.getCredentials().then(function(creds) {
                    creds.should.eql(credentials);
                    done();
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


    it('should backup existing credentials', function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");
        var credFileBackup = path.join(userDir,".test_cred.json.backup");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath,getUserSettings: () => {{}}}, mockRuntime).then(function() {

            fs.writeFileSync(credFile,"{}","utf8");

            fs.existsSync(credFile).should.be.true();
            fs.existsSync(credFileBackup).should.be.false();

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true();
                fs.existsSync(credFileBackup).should.be.true();
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });

    it('should format the creds file when flowFilePretty specified',function(done) {
        var flowFile = 'test.json';
        var flowFilePath = path.join(userDir,flowFile);
        var credFile = path.join(userDir,"test_cred.json");

        localfilesystem.init({userDir:userDir, flowFile:flowFilePath, flowFilePretty:true,getUserSettings: () => {{}}}, mockRuntime).then(function() {

            fs.existsSync(credFile).should.be.false();

            var credentials = {"abc":{"type":"creds"}};

            localfilesystem.saveCredentials(credentials).then(function() {
                fs.existsSync(credFile).should.be.true();
                var content = fs.readFileSync(credFile,"utf8");
                content.split("\n").length.should.be.above(1);
                localfilesystem.getCredentials().then(function(creds) {
                    creds.should.eql(credentials);
                    done();
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

    it('should handle flow file in random unc path and non-existent subfolder',function(done) {
        // only test on win32
        if (process.platform !== 'win32') {
          console.log('skipped test as not win32');
          done();
          return;
        }
        
        // get a real windows path
        var flowFile = path.win32.resolve(userDir+'/some/random/path');
        var rootdir = path.win32.resolve(userDir+'/some');
        // make it into a local UNC path
        flowFile = flowFile.replace('C:\\', '\\\\localhost\\c$\\');
        localfilesystem.init({userDir:userDir, flowFile:flowFile, getUserSettings: () => {{}}}, mockRuntime).then(function() {
            fs.existsSync(flowFile).should.be.false();
            localfilesystem.saveFlows(testFlow).then(function() {
                fs.existsSync(flowFile).should.be.true();
                localfilesystem.getFlows().then(function(flows) {
                    flows.should.eql(testFlow);
                    // cleanup
                    fs.removeSync(rootdir);
                    done();
                }).catch(function(err) {
                    // cleanup
                    fs.removeSync(rootdir);
                    done(err);
                });
            }).catch(function(err) {
                // cleanup
                fs.removeSync(rootdir);
                done(err);
            });
        }).catch(function(err) {
            // cleanup
            fs.removeSync(rootdir);
            done(err);
        });
    });
    
});
