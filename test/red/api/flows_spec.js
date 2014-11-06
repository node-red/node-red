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
var sinon = require('sinon');
var when = require('when');

var redNodes = require("../../../red/nodes");

var flows = require("../../../red/api/flows");

describe("flows api", function() {
        
    var app;

    before(function() {
        app = express();
        app.use(express.json());
        app.get("/flows",flows.get);
        app.post("/flows",flows.post);
    });
    
    it('returns flow', function(done) {
        var getFlows = sinon.stub(redNodes,'getFlows', function() {
            return [1,2,3];
        });
        request(app)
            .get('/flows')
            .set('Accept', 'application/json')
            .expect(200)
            .end(function(err,res) {
                getFlows.restore();
                if (err) {
                    throw err;
                }
                res.body.should.be.an.Array.and.have.lengthOf(3);
                done();
            });
    });
    
    it('sets flows', function(done) {
        var setFlows = sinon.stub(redNodes,'setFlows', function() {
            return when.resolve();
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .expect(204)
            .end(function(err,res) {
                setFlows.restore();
                if (err) {
                    throw err;
                }
                done();
            });
    });
    it('returns error when set fails', function(done) {
        var setFlows = sinon.stub(redNodes,'setFlows', function() {
            return when.reject(new Error("expected error"));
        });
        request(app)
            .post('/flows')
            .set('Accept', 'application/json')
            .expect(500)
            .end(function(err,res) {
                setFlows.restore();
                if (err) {
                    throw err;
                }
                res.text.should.eql("expected error");
                done();
            });
    });
    
});
