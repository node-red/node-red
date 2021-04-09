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

var info = NR_TEST_UTILS.require("@node-red/editor-api/lib/admin/settings");
var theme = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/theme");

describe("api/editor/settings", function() {
    before(function() {
        sinon.stub(theme,"settings").callsFake(function() { return { existing: 123, test: 456 };});
        app = express();
        app.use(bodyParser.json());
        app.get("/settings",info.runtimeSettings);
    });

    after(function() {
        theme.settings.restore();
    });

    it('returns the runtime settings', function(done) {
        info.init({},{
            settings: {
                getRuntimeSettings: function(opts) {
                    return Promise.resolve({
                        a:1,
                        b:2,
                        editorTheme: { existing: 789 }
                    })
                }
            }
        });
        request(app)
        .get("/settings")
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property("a",1);
            res.body.should.have.property("b",2);
            res.body.should.have.property("editorTheme",{existing: 789, test:456});
            done();
        });
    });
    it('returns the runtime settings - disableEditor true', function(done) {
        info.init({disableEditor: true},{
            settings: {
                getRuntimeSettings: function(opts) {
                    return Promise.resolve({
                        a:1,
                        b:2
                    })
                }
            }
        });
        request(app)
        .get("/settings")
        .expect(200)
        .end(function(err,res) {
            if (err) {
                return done(err);
            }
            res.body.should.have.property("a",1);
            res.body.should.have.property("b",2);
            // no editorTheme if disabledEditor true
            res.body.should.not.have.property("editorTheme");
            done();
        });
    });

});
