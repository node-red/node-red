/**
 * Copyright 2014 IBM Corp.
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

    it('returns flow', function(done) {
        flows.init({
            log:{warn:function(){},_:function(){},audit:function(){}},
            nodes:{
                getFlows: function() { return [1,2,3]; }
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
                res.body.should.be.an.Array.and.have.lengthOf(3);
                done();
            });
    });

    it('sets flows - default', function(done) {
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
                setFlows.calledOnce.should.be.true;
                setFlows.lastCall.args[1].should.eql('full');
                done();
            });
    });
    it('sets flows - non-default', function(done) {
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
                setFlows.calledOnce.should.be.true;
                setFlows.lastCall.args[1].should.eql('nodes');
                done();
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
                loadFlows.called.should.be.true;
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
