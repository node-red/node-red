/**
 * Copyright 2014, 2015 IBM Corp.
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
var fs = require("fs");
var path = require("path");

var RED = require("../../red/red");
var log = require("../../red/log");
var settings = require("../../red/settings");
var server = require("../../red/server");


describe("red/red", function() {

    describe("check build", function() {
        beforeEach(function() {
            sinon.stub(log,"init",function() {});
            sinon.stub(settings,"init",function() {});
            sinon.stub(server,"init",function() {});
            sinon.stub(RED,"version",function() { return "version";});
        });
        afterEach(function() {
            log.init.restore();
            settings.init.restore();
            server.init.restore();
            fs.statSync.restore();
            RED.version.restore();
        });
        it('warns if build has not been run',function() {
            sinon.stub(fs,"statSync",function() { throw new Error();});
            
            /*jshint immed: false */
            (function() {
                RED.init({},{});
            }).should.throw("Node-RED not built");
        });
        it('passed if build has been run',function() {
            sinon.stub(fs,"statSync",function() { });
            RED.init({},{});
        });
    });
    
    describe("externals", function() {
        it('reports version', function() {
            var p = require(path.join(process.env.NODE_RED_HOME,"package.json")).version;
            RED.version().indexOf(p).should.eql(0);
        });
        it('access server externals', function() {
            // TODO: unstubable accessors - need to make this testable
            RED.app;
            RED.httpAdmin;
            RED.httpNode;
            RED.server;
        });
    });

});
