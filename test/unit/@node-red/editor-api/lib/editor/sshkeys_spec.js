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
var NR_TEST_UTILS = require("nr-test-utils");
var sshkeys = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/sshkeys");
var bodyParser = require("body-parser");


describe("api/editor/sshkeys", function() {
    var app;
    var mockRuntime = {
        settings: {
            getUserKeys: function() {},
            getUserKey: function() {},
            generateUserKey: function() {},
            removeUserKey: function() {}
        }
    }
    before(function() {
        sshkeys.init(mockRuntime);
        app = express();
        app.use(bodyParser.json());
        app.use("/settings/user/keys", sshkeys.app());
    });

    beforeEach(function() {
        sinon.stub(mockRuntime.settings, "getUserKeys");
        sinon.stub(mockRuntime.settings, "getUserKey");
        sinon.stub(mockRuntime.settings, "generateUserKey");
        sinon.stub(mockRuntime.settings, "removeUserKey");
    })
    afterEach(function() {
        mockRuntime.settings.getUserKeys.restore();
        mockRuntime.settings.getUserKey.restore();
        mockRuntime.settings.generateUserKey.restore();
        mockRuntime.settings.removeUserKey.restore();
    })

    it('GET /settings/user/keys --- return empty list', function(done) {
        mockRuntime.settings.getUserKeys.returns(Promise.resolve([]));
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
        mockRuntime.settings.getUserKeys.returns(Promise.resolve(retList));
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
        mockRuntime.settings.getUserKeys.returns(p);
        request(app)
        .get("/settings/user/keys")
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal(errInstance.code);
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.message);
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return 404', function(done) {
        var errInstance = new Error("Not Found.");
        errInstance.code = "not_found";
        errInstance.status = 404;
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.settings.getUserKey.returns(p);
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
        var errInstance = new Error();
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.settings.getUserKeys.returns(p)
        request(app)
        .get("/settings/user/keys")
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal(errInstance.toString());
            done();
        });
    });

    it('GET /settings/user/keys/<key_file_name> --- return content', function(done) {
        var key_file_name = "test_key";
        var fileContent = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQD3a+sgtgzSbbliWxmOq5p6+H/mE+0gjWfLWrkIVmHENd1mifV4uCmIHAR2NfuadUYMQ3+bQ90kpmmEKTMYPsyentsKpHQZxTzG7wOCAIpJnbPTHDMxEJhVTaAwEjbVyMSIzTTPfnhoavWIBu0+uMgKDDlBm+RjlgkFlyhXyCN6UwFrIUUMH6Gw+eQHLiooKIl8ce7uDxIlt+9b7hFCU+sQ3kvuse239DZluu6+8buMWqJvrEHgzS9adRFKku8nSPAEPYn85vDi7OgVAcLQufknNgs47KHBAx9h04LeSrFJ/P5J1b//ItRpMOIme+O9d1BR46puzhvUaCHLdvO9czj+OmW+dIm+QIk6lZIOOMnppG72kZxtLfeKT16ur+2FbwAdL9ItBp4BI/YTlBPoa5mLMxpuWfmX1qHntvtGc9wEwS1P7YFfmF3XiK5apxalzrn0Qlr5UmDNbVIqJb1OlbC0w03Z0oktti1xT+R2DGOLWM4lBbpXDHV1BhQ7oYOvbUD8Cnof55lTP0WHHsOHlQc/BGDti1XA9aBX/OzVyzBUYEf0pkimsD0RYo6aqt7QwehJYdlz9x1NBguBffT0s4NhNb9IWr+ASnFPvNl2sw4XH/8U0J0q8ZkMpKkbLM1Zdp1Fv00GF0f5UNRokai6uM3w/ccantJ3WvZ6GtctqytWrw== \n";
        mockRuntime.settings.getUserKey.returns(Promise.resolve(fileContent));
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            mockRuntime.settings.getUserKey.called.should.be.true();
            mockRuntime.settings.getUserKey.firstCall.args[0].should.eql({ user: undefined, id: 'test_key' });
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
        mockRuntime.settings.getUserKey.returns(p);
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal(errInstance.code);
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
        mockRuntime.settings.getUserKey.returns(p);
        request(app)
        .get("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal("Messages.....");
            done();
        });
    });

    it('POST /settings/user/keys --- success', function(done) {
        var key_file_name = "test_key";
        mockRuntime.settings.generateUserKey.returns(Promise.resolve(key_file_name));
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

    it('POST /settings/user/keys --- return Error', function(done) {
        var key_file_name = "test_key";
        var errInstance = new Error("Messages.....");
        errInstance.code = "test_code";
        var p = Promise.reject(errInstance);
        p.catch(()=>{});
        mockRuntime.settings.generateUserKey.returns(p);
        request(app)
        .post("/settings/user/keys")
        .send({ name: key_file_name })
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("test_code");
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
        mockRuntime.settings.generateUserKey.returns(p);
        request(app)
        .post("/settings/user/keys")
        .send({ name: key_file_name })
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal("Messages.....");
            done();
        });
    });

    it('DELETE /settings/user/keys/<key_file_name> --- success', function(done) {
        var key_file_name = "test_key";
        mockRuntime.settings.removeUserKey.returns(Promise.resolve(true));
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
        mockRuntime.settings.removeUserKey.returns(p);
        request(app)
        .delete("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("test_code");
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
        mockRuntime.settings.removeUserKey.returns(p);
        request(app)
        .delete("/settings/user/keys/" + key_file_name)
        .expect(400)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property('code');
            res.body.code.should.be.equal("unexpected_error");
            res.body.should.have.property('message');
            res.body.message.should.be.equal('Messages.....');
            done();
        });
    });
});
