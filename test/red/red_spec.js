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

describe("red/red", function() {
    it('can be required without errors', function() {
        require("../../red/red");
    });

    var RED = require("../../red/red");

    it('returns an app object', function() {
        var srv = RED.app.use("/test", function() { return "app"; });
        srv.should.be.an.instanceOf(Object);
    });

    it('returns an httpAdmin object', function() {
        var srv = RED.httpAdmin.use("/test", function() { return "Admin"; });
        srv.should.be.an.instanceOf(Object);
    });

    it('returns an httpNode object', function() {
        var srv = RED.httpNode.use("/test", function() { return "Node"; });
        srv.should.be.an.instanceOf(Object);
    });

    it('it returns a server object', function() {
        var srv = RED.server;
        srv.should.be.an.instanceOf(Object).and.have.property('domain', null);
        //srv.should.be.an.instanceOf(Object).and.have.property('timeout', 120000);
    });

});
