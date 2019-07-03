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
var request = require("supertest");
var express = require("express");
var fs = require("fs");
var path = require("path");

var NR_TEST_UTILS = require("nr-test-utils");

var ui = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/ui");


describe("api/editor/ui", function() {
    var app;

    before(function() {
        ui.init({
            nodes: {
                getIcon: function(opts) {
                    return new Promise(function(resolve,reject) {
                        fs.readFile(NR_TEST_UTILS.resolve("@node-red/editor-client/src/images/icons/arrow-in.svg"), function(err,data) {
                            resolve(data);
                        })
                    });
                }
            }
        });
    });
    describe("slash handler", function() {
        before(function() {
            app = express();
            app.get("/foo",ui.ensureSlash,function(req,res) { res.sendStatus(200);});
        });
        it('redirects if the path does not end in a slash',function(done) {
            request(app)
                .get('/foo')
                .expect(301,done);
        });
        it('redirects if the path, with query string, does not end in a slash',function(done) {
            request(app)
                .get('/foo?abc=def')
                .expect(301)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    res.header['location'].should.equal("/foo/?abc=def");
                    done();
                });
        });

        it('does not redirect if the path ends in a slash',function(done) {
            request(app)
                .get('/foo/')
                .expect(200,done);
        });
    });

    describe("icon handler", function() {
        before(function() {
            app = express();
            app.get("/icons/:module/:icon",ui.icon);
        });

        function binaryParser(res, callback) {
            res.setEncoding('binary');
            res.data = '';
            res.on('data', function (chunk) {
                res.data += chunk;
            });
            res.on('end', function () {
                callback(null, Buffer.from(res.data, 'binary'));
            });
        }
        function compareBuffers(b1,b2) {
            b1.length.should.equal(b2.length);
            for (var i=0;i<b1.length;i++) {
                b1[i].should.equal(b2[i]);
            }
        }
        it('returns the requested icon', function(done) {
            var defaultIcon = fs.readFileSync(NR_TEST_UTILS.resolve("@node-red/editor-client/src/images/icons/arrow-in.svg"));
            request(app)
                .get("/icons/module/icon.png")
                .expect("Content-Type", /image\/png/)
                .expect(200)
                .parse(binaryParser)
                .end(function(err,res) {
                    if (err){
                        return done(err);
                    }
                    Buffer.isBuffer(res.body).should.be.true();
                    compareBuffers(res.body,defaultIcon);
                    done();
                });

        });
    });

    describe("editor ui handler", function() {
        before(function() {
            app = express();
            app.use("/",ui.editor);
        });
        it('serves the editor', function(done) {
            request(app)
                .get("/")
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    // Index page should probably mention Node-RED somewhere
                    res.text.indexOf("Node-RED").should.not.eql(-1);
                    done();
                });
        });
    });

    describe("editor ui resource handler", function() {
        before(function() {
            app = express();
            app.use("/",ui.editorResources);
        });
        it('serves the editor resources', function(done) {
            request(app)
                .get("/favicon.ico")
                .expect(200)
                .end(function(err,res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });
});
