/**
 * Copyright 2015 IBM Corp.
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
var sentimentNode = require("../../../../nodes/core/analysis/72-sentiment.js");
var helper = require("../../helper.js");

describe('sentiment Node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"sentimentNode1", type:"sentiment", name: "sentimentNode" }];
        helper.load(sentimentNode, flow, function() {
            var sentimentNode1 = helper.getNode("sentimentNode1");
            sentimentNode1.should.have.property('name', 'sentimentNode');
            done();
        });
    });

    it('should pass on msg if no payload', function(done) {
        var flow = [{id:"jn1",type:"sentiment",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(sentimentNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.not.have.property('sentiment');
                msg.topic.should.equal("pass on");
                done();
            });
            var testString = 'good, great, best, brilliant';
            jn1.receive({topic:"pass on"});
        });
    });

    it('should add a positive score for good words', function(done) {
        var flow = [{id:"jn1",type:"sentiment",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(sentimentNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('sentiment');
                msg.sentiment.should.have.property('score');
                msg.sentiment.score.should.be.a.number;
                msg.sentiment.score.should.be.above(10);
                done();
            });
            var testString = 'good, great, best, brilliant';
            jn1.receive({payload:testString});
        });
    });

    it('should add a negative score for bad words', function(done) {
        var flow = [{id:"jn1",type:"sentiment",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(sentimentNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('sentiment');
                msg.sentiment.should.have.property('score');
                msg.sentiment.score.should.be.a.number;
                msg.sentiment.score.should.be.below(-10);
                done();
            });
            var testString = 'bad, horrible, negative, awful';
            jn1.receive({payload:testString});
        });
    });

    it('should allow you to override word scoring', function(done) {
        var flow = [{id:"jn1",type:"sentiment",wires:[["jn2"]]},
                    {id:"jn2", type:"helper"}];
        helper.load(sentimentNode, flow, function() {
            var jn1 = helper.getNode("jn1");
            var jn2 = helper.getNode("jn2");
            jn2.on("input", function(msg) {
                msg.should.have.property('sentiment');
                msg.sentiment.should.have.property('score');
                msg.sentiment.score.should.be.a.number;
                msg.sentiment.score.should.equal(20);
                done();
            });
            var testString = 'sick, wicked';
            var overrides = {'sick': 10, 'wicked': 10 };
            jn1.receive({payload:testString,overrides:overrides});
        });
    });

});
