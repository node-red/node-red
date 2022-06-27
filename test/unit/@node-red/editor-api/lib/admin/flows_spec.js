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
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');
var sinon = require('sinon');

var NR_TEST_UTILS = require("nr-test-utils");

var flows = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/flows");

describe("api/admin/flows", function() {

    var app;

    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/flows",flows.get);
        app.get("/flows/state",flows.getState);
        app.post("/flows",flows.post);
        app.post("/flows/state",flows.postState);
    });

    it('returns flow - v1', function(done) {
        flows.init({
            flows:{
                getFlows: function() { return Promise.resolve({rev:"123",flows:[1,2,3]}); }
            }
        });
        request(app)
            .get('/flows')
            .set('Accept', 'application/json')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.lengthOf(3);
                    done();
                } catch(e) {
                    return done(e);
                }
            });
    });
    it('returns flow - v2', function(done) {
        flows.init({
            flows:{
                getFlows: function() { return Promise.resolve({rev:"123",flows:[1,2,3]}); }
            }
        });
        request(app)
            .get('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','v2')
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.a.property('rev','123');
                    res.body.should.have.a.property('flows');
                    res.body.flows.should.have.lengthOf(3);
                    done();
                } catch(e) {
                    return done(e);
                }
            });
    });
    it('returns flow - bad version', function(done) {
        request(app)
            .get('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','xxx')
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.a.property('code','invalid_api_version');
                    done();
                } catch(e) {
                    return done(e);
                }
            });
    });
    it('sets flows - default - v1', function(done) {
        var setFlows = sinon.spy(function() { return Promise.resolve();});
        flows.init({
            flows:{
                setFlows: setFlows
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .expect(204)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                setFlows.calledOnce.should.be.true();
                setFlows.lastCall.args[0].should.have.property('deploymentType','full');
                done();
            });
    });
    it('sets flows - non-default - v1', function(done) {
        var setFlows = sinon.spy(function() { return Promise.resolve();});
        flows.init({
            flows:{
                setFlows: setFlows
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-Deployment-Type','nodes')
            .expect(204)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                setFlows.calledOnce.should.be.true();
                setFlows.lastCall.args[0].should.have.property('deploymentType','nodes');
                done();
            });
    });

    it('set flows - rejects mismatched revision - v2', function(done) {
        flows.init({
            flows:{
                setFlows: function() {
                    var err = new Error("mismatch");
                    err.code = "version_mismatch";
                    err.status = 409;
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                }
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','v2')
            .send({rev:456,flows:[4,5,6]})
            .expect(409)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("code","version_mismatch");
                done();
            });
    });
    it('sets flow - bad version', function(done) {
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','xxx')
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.a.property('code','invalid_api_version');
                    done();
                } catch(e) {
                    return done(e);
                }
            });
    });
    it('reloads flows', function(done) {
        var setFlows = sinon.spy(function() { return Promise.resolve();});
        flows.init({
            flows:{
                setFlows: setFlows
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-Deployment-Type','reload')
            .expect(204)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                setFlows.called.should.be.true();
                setFlows.lastCall.args[0].should.not.have.property('flows');
                done();
            });
    });
    it('returns flows run state', function (done) {
        var setFlows = sinon.spy(function () { return Promise.resolve(); });
        flows.init({
            flows: {
                setFlows,
                getState: async function () {
                    return { started: true, state: "started" };
                }
            }
        });
        request(app)
            .get('/flows/state')
            .set('Accept', 'application/json')
            .set('Node-RED-Deployment-Type', 'reload')
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.a.property('started', true);
                    res.body.should.have.a.property('state', "started");
                    done();
                } catch (e) {
                    return done(e);
                }
            });
    });
    it('sets flows run state - stopped', function (done) {
        var setFlows = sinon.spy(function () { return Promise.resolve(); });
        flows.init({
            flows: {
                setFlows: setFlows,
                getState: async function () {
                    return { started: true, state: "started" };
                },
                setState: async function () {
                    return { started: false, state: "stopped" };
                },
            }
        });
        request(app)
            .post('/flows/state')
            .set('Accept', 'application/json')
            .send({state:'stop'})
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                try {
                    res.body.should.have.a.property('started', false);
                    res.body.should.have.a.property('state', "stopped");
                    done();
                } catch (e) {
                    return done(e);
                }
            });
    });
    it('sets flows run state - bad value', function (done) {
        var setFlows = sinon.spy(function () { return Promise.resolve(); });
        const makeError = (error, errcode, statusCode) => {
            const message = typeof error == "object" ? error.message : error
            const err = typeof error == "object" ? error : new Error(message||"Unexpected Error")
            err.status = err.status || statusCode || 400;
            err.code = err.code || errcode || "unexpected_error"
            return err
        }
        flows.init({
            flows: {
                setFlows: setFlows,
                getState: async function () {
                    return { started: true, state: "started" };
                },
                setState: async function () {
                    var err = (makeError("Cannot set runtime state. Invalid state", "invalid_run_state", 400))
                    var p = Promise.reject(err);
                    p.catch(()=>{});
                    return p;
                },
            }
        });
        request(app)
            .post('/flows/state')
            .set('Accept', 'application/json')
            .send({state:'bad-state'})
            .expect(400)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("code","invalid_run_state");
                done();
            });
    });
});
