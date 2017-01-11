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
var when = require('when');

var flows = require("../../../red/api/flows");

describe("flows api", function() {

    var app;

    before(function() {
        app = express();
        app.use(bodyParser.json());
        app.get("/flows",flows.get);
        app.post("/flows",flows.post);
    });

    it('returns flow - v1', function(done) {
        flows.init({
            settings: {},
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                getFlows: function() { return {rev:"123",flows:[1,2,3]}; }
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
            settings: {},
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                getFlows: function() { return {rev:"123",flows:[1,2,3]}; }
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
        var setFlows = sinon.spy(function() { return when.resolve();});
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
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
                setFlows.lastCall.args[1].should.eql('full');
                done();
            });
    });
    it('sets flows - non-default - v1', function(done) {
        var setFlows = sinon.spy(function() { return when.resolve();});
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
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
                setFlows.lastCall.args[1].should.eql('nodes');
                done();
            });
    });

    it('set flows - rejects mismatched revision - v2', function(done) {
        var setFlows = sinon.spy(function() { return when.resolve();});
        var getFlows = sinon.spy(function() { return {rev:123,flows:[1,2,3]}});
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                setFlows: setFlows,
                getFlows: getFlows
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
    it('set flows - rev provided - v2', function(done) {
        var setFlows = sinon.spy(function() { return when.resolve(456);});
        var getFlows = sinon.spy(function() { return {rev:123,flows:[1,2,3]}});
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                setFlows: setFlows,
                getFlows: getFlows
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','v2')
            .send({rev:123,flows:[4,5,6]})
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("rev",456);
                done();
            });
    });
    it('set flows - no rev provided - v2', function(done) {
        var setFlows = sinon.spy(function() { return when.resolve(456);});
        var getFlows = sinon.spy(function() { return {rev:123,flows:[1,2,3]}});
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                setFlows: setFlows,
                getFlows: getFlows
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .set('Node-RED-API-Version','v2')
            .send({flows:[4,5,6]})
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("rev",456);
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
        var loadFlows = sinon.spy(function() { return when.resolve(); });
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                loadFlows: loadFlows
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
                loadFlows.called.should.be.true();
                done();
            });
    });

    it('returns error when set fails', function(done) {
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                setFlows: function() { return when.reject(new Error("expected error")); }
            }
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .expect(500)
            .end(function(err,res) {
                if (err) {
                    return done(err);
                }
                res.body.should.have.property("message","expected error");
                done();
            });
    });

});
