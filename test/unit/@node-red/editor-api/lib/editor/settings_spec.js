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
var bodyParser = require("body-parser");
var sinon = require('sinon');

var app;

var NR_TEST_UTILS = require("nr-test-utils");

var info = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/settings");
var theme = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/theme");

describe("api/editor/settings", function() {
    before(function() {
        sinon.stub(theme,"settings").callsFake(function() { return { existing: 123, test: 456 };});
        app = express();
        app.use(bodyParser.json());
        app.get("/settings/user",function(req,res,next) {req.user = "fred"; next()}, info.userSettings);
        app.post("/settings/user",function(req,res,next) {req.user = "fred"; next()},info.updateUserSettings);
    });

    after(function() {
        theme.settings.restore();
    });

    it('returns the user settings', function(done) {
        info.init({}, {
            settings: {
                getUserSettings: function(opts) {
                    if (opts.user !== "fred") {
                        return Promise.reject(new Error("Unknown user"));
                    }
                    return Promise.resolve({
                        c:3,
                        d:4
                    })
                }
            }
        });
        request(app)
        .get("/settings/user")
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.eql({c:3,d:4});
            done();
        });
    });
    it('updates the user settings', function(done) {
        var update;
        info.init({}, {
            settings: {
                updateUserSettings: function(opts) {
                    if (opts.user !== "fred") {
                        return Promise.reject(new Error("Unknown user"));
                    }
                    update = opts.settings;
                    return Promise.resolve()
                }
            }
        });
        request(app)
        .post("/settings/user")
        .send({
            e:4,
            f:5
        })
        .expect(204)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            update.should.eql({e:4,f:5});
            done();
        });
    });

});
