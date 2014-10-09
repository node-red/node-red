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

var config = require("../../../../red/cli/lib/config");

describe("cli config", function() {
    afterEach(function() {
        config.unload();
    });
    it('loads preferences when target referenced', sinon.test(function() {
        this.stub(fs,"readFileSync",function() {
            return '{"target":"http://example.com:1880"}'
        });
        config.target.should.eql("http://example.com:1880");
    }));
    it('provide default value for target', sinon.test(function() {
        this.stub(fs,"readFileSync",function() {
            return '{}'
        });
        config.target.should.eql("http://localhost:1880");
    }));
    it('saves preferences when target set', sinon.test(function() {
        this.stub(fs,"readFileSync",function() {
            return '{"target":"http://another.example.com:1880"}'
        });
        this.stub(fs,"writeFileSync",function() {});
        
        config.target.should.eql("http://another.example.com:1880");
        config.target = "http://final.example.com:1880";
        
        fs.readFileSync.calledOnce.should.be.true;
        fs.writeFileSync.calledOnce.should.be.true;
        
    }));
        
});