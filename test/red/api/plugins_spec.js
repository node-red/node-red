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

var app = express();
var redNodes = require("../../../red/nodes");
var server = require("../../../red/server");
var settings = require("../../../red/settings");

var plugins = require("../../../red/api/plugins");

describe("plugins api", function() {

    var app;

    before(function() {
        app = express();
        app.use(express.json());
        app.get("/plugins",plugins.getAll);
        app.get("/plugins/:id",plugins.get);
    });

    describe('get plugins', function() {
        it('returns plugins list', function(done) {
            var getPluginList = sinon.stub(redNodes,'getPluginList', function() {
                return [1,2,3];
            });
            request(app)
                .get('/plugins')
                .expect(200)
                .end(function(err,res) {
                    getPluginList.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.be.an.Array.and.have.lengthOf(3);
                    done();
                });
        });

        it('returns an individual plugin info', function(done) {
            var getPluginInfo = sinon.stub(redNodes,'getPluginInfo', function(id) {
                return {"name":"123", "nodes":[1,2,3]};
            });
            request(app)
                .get('/plugins/123')
                .expect(200)
                .end(function(err,res) {
                    getPluginInfo.restore();
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name","123");
                    res.body.should.have.property("nodes",[1,2,3]);
                    done();
                });
        });
    });
});
