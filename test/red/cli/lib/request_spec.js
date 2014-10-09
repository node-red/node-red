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
var sinon = require("sinon");
var fs = require("fs");
var request = require("request");

var apiRequest = require("../../../../red/cli/lib/request");
var config = require("../../../../red/cli/lib/config");

describe("cli request", function() {
    var sandbox = sinon.sandbox.create();
    before(function() {
        sandbox.stub(fs,"readFileSync",function() {
            return '{"target":"http://example.com:1880"}'
        });
    });
    after(function() {
        sandbox.restore();
    });
                
    it('returns the json response to a get', sinon.test(function(done) {
        this.stub(request, 'get').yields(null, {statusCode:200}, JSON.stringify({a: "b"}));
            
        apiRequest("/foo",{}).then(function(res) {
            res.should.eql({a:"b"});
            done();
        }).otherwise(function(err) {
            done(err);
        });
    }));
});