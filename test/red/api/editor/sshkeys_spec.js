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
var sinon = require("sinon");
var request = require("supertest");
var express = require("express");
var editorApi = require("../../../../red/api/editor");
var comms = require("../../../../red/api/editor/comms");
var info = require("../../../../red/api/editor/settings");
var auth = require("../../../../red/api/auth");
var sshkeys = require("../../../../red/api/editor/sshkeys");
var when = require("when");
var bodyParser = require("body-parser");
var fs = require("fs-extra");
var fspath = require("path");


describe("api/editor/sshkeys", function() {
    var app;
    var mockList = [
        'library','theme','locales','credentials','comms'
    ]
    var isStarted = true;
    var errors = [];
    var session_data = {};

    var mockRuntime = {
        settings:{
            httpNodeRoot: true,
            httpAdminRoot: true,
            disableEditor: false,
            exportNodeSettings:function(){},
            storage: {
                getSessions: function(){
                    return when.resolve(session_data);
                },
                setSessions: function(_session) {
                    session_data = _session;
                    return when.resolve();
                }
            }
        },
        log:{audit:function(){},error:function(msg){errors.push(msg)},trace:function(){}},
        storage: {
            projects: {
                ssh: {
                    init: function(){},
                    listSSHKeys: function(){},
                    getSSHKey: function(){},
                    generateSSHKey: function(){},
                    deleteSSHKey: function(){}
                }
            }
        },
        events:{on:function(){},removeListener:function(){}},
        isStarted: function() { return isStarted; },
        nodes: {paletteEditorEnabled: function() { return false }}
    };

    before(function() {
        auth.init(mockRuntime);
        app = express();
        app.use(bodyParser.json());
        app.use(editorApi.init({},mockRuntime));
    });
    after(function() {
    })

    beforeEach(function() {
        sinon.stub(mockRuntime.storage.projects.ssh, "listSSHKeys");
        sinon.stub(mockRuntime.storage.projects.ssh, "getSSHKey");
        sinon.stub(mockRuntime.storage.projects.ssh, "generateSSHKey");
        sinon.stub(mockRuntime.storage.projects.ssh, "deleteSSHKey");
    })
    afterEach(function() {
        mockRuntime.storage.projects.ssh.listSSHKeys.restore();
        mockRuntime.storage.projects.ssh.getSSHKey.restore();
        mockRuntime.storage.projects.ssh.generateSSHKey.restore();
        mockRuntime.storage.projects.ssh.deleteSSHKey.restore();
    })

    it('GET /settings/user/keys --- return empty list', function(done) {
        mockRuntime.storage.projects.ssh.listSSHKeys.returns(Promise.resolve([]));
        request(app)
        .get("/settings/user/keys")
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('keys');
            res.body.keys.should.be.empty();
            done();
        });
    });

    it('GET /settings/user/keys --- return normal list', function(done) {
        var fileList = [
            'test_key01',
            'test_key02'
        ];
        var retList = fileList.map(function(elem) {
            return {
                name: elem
            };
        });
        mockRuntime.storage.projects.ssh.listSSHKeys.returns(Promise.resolve(retList));
        request(app)
        .get("/settings/user/keys")
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('keys');
            for (var item of retList) {
                res.body.keys.should.containEql(item);
            }
            done();
        });
    });

    it('GET /settings/user/keys --- return Error', function(done) {
        var errInstance = new Error("Messages here.....");
        errInstance.code = "test_code";
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.listSSHKeys.returns(p);
        request(app)
        .get("/settings/user/keys")
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal(errInstance.code);
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.message);
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return 404', function(done) {
        mockRuntime.storage.projects.ssh.getSSHKey.returns(Promise.resolve(null));
        request(app)
        .get("/settings/user/keys/NOT_REAL")
        .expect(404)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            done();
        });
    });
    it('GET /settings/user/keys --- return Unexpected Error', function(done) {
        var errInstance = new Error("Messages.....");
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.listSSHKeys.returns(p);
        request(app)
        .get("/settings/user/keys")
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.toString());
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return content', function(done) {
        var key_file_name = "test_key";
        var fileContent = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQD3a+sgtgzSbbliWxmOq5p6+H/mE+0gjWfLWrkIVmHENd1mifV4uCmIHAR2NfuadUYMQ3+bQ90kpmmEKTMYPsyentsKpHQZxTzG7wOCAIpJnbPTHDMxEJhVTaAwEjbVyMSIzTTPfnhoavWIBu0+uMgKDDlBm+RjlgkFlyhXyCN6UwFrIUUMH6Gw+eQHLiooKIl8ce7uDxIlt+9b7hFCU+sQ3kvuse239DZluu6+8buMWqJvrEHgzS9adRFKku8nSPAEPYn85vDi7OgVAcLQufknNgs47KHBAx9h04LeSrFJ/P5J1b//ItRpMOIme+O9d1BR46puzhvUaCHLdvO9czj+OmW+dIm+QIk6lZIOOMnppG72kZxtLfeKT16ur+2FbwAdL9ItBp4BI/YTlBPoa5mLMxpuWfmX1qHntvtGc9wEwS1P7YFfmF3XiK5apxalzrn0Qlr5UmDNbVIqJb1OlbC0w03Z0oktti1xT+R2DGOLWM4lBbpXDHV1BhQ7oYOvbUD8Cnof55lTP0WHHsOHlQc/BGDti1XA9aBX/OzVyzBUYEf0pkimsD0RYo6aqt7QwehJYdlz9x1NBguBffT0s4NhNb9IWr+ASnFPvNl2sw4XH/8U0J0q8ZkMpKkbLM1Zdp1Fv00GF0f5UNRokai6uM3w/ccantJ3WvZ6GtctqytWrw== \n";
        mockRuntime.storage.projects.ssh.getSSHKey.returns(Promise.resolve(fileContent));
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            mockRuntime.storage.projects.ssh.getSSHKey.called.should.be.true();
            res.body.should.be.deepEqual({ publickey: fileContent });
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        errInstance.code = "test_code";
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.getSSHKey.returns(p);
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal(errInstance.code);
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.message);
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return Unexpected Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.getSSHKey.returns(p);
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.toString());
            done();
        });
    });

    it('POST /settings/user/keys --- success', function(done) {
        var key_file_name = "test_key";
        mockRuntime.storage.projects.ssh.generateSSHKey.returns(Promise.resolve(key_file_name));
        request(app)
        .post("/settings/user/keys")
        .send({ name: key_file_name })
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    it('POST /settings/user/keys --- return parameter error', function(done) {
        var key_file_name = "test_key";
        mockRuntime.storage.projects.ssh.generateSSHKey.returns(Promise.resolve(key_file_name));
        request(app)
        .post("/settings/user/keys")
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal("You need to have body or body.name");
            done();
        });
    });

    it('POST /settings/user/keys --- return Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        errInstance.code = "test_code";
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.generateSSHKey.returns(p);
        request(app)
        .post("/settings/user/keys")
        .send({ name: key_file_name })
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("test_code");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.message);
            done();
        });
    });

    it('POST /settings/user/keys --- return Unexpected error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.generateSSHKey.returns(p);
        request(app)
        .post("/settings/user/keys")
        .send({ name: key_file_name })
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.toString());
            done();
        });
    });

    it('DELETE /settings/user/keys/<key_file_name> --- success', function(done) {
        var key_file_name = "test_key";
        mockRuntime.storage.projects.ssh.deleteSSHKey.returns(Promise.resolve(true));
        request(app)
        .delete("/settings/user/keys/" + key_file_name)
        .expect(204)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.be.deepEqual({});
            done();
        });
    });

    it('DELETE /settings/user/keys/<key_file_name> --- return Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        errInstance.code = "test_code";
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.deleteSSHKey.returns(p);
        request(app)
        .delete("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("test_code");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.message);
            done();
        });
    });

    it('DELETE /settings/user/keys/<key_file_name> --- return Unexpected Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.storage.projects.ssh.deleteSSHKey.returns(p);
        request(app)
        .delete("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('error');
            res.body.error.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.toString());
            done();
        });
    });
});
