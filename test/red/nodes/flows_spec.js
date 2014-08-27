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
var when = require("when");
var flows = require("../../../red/nodes/flows");
var RedNode = require("../../../red/nodes/Node");
var RED = require("../../../red/nodes");
var events = require("../../../red/events");
var typeRegistry = require("../../../red/nodes/registry");


var settings = {
    available: function() { return false; }
}

function loadFlows(testFlows, cb) {
    var storage = {
        getFlows: function() {
            return when.resolve(testFlows);
        },
        getCredentials: function() {
            return when.resolve({});
        }
    };
    RED.init(settings, storage);
    flows.load().then(function() {
        should.deepEqual(testFlows, flows.getFlows());
        cb();
    });
}

describe('flows', function() {

    describe('#add',function() {
        it('should be called by node constructor',function(done) {
            var n = new RedNode({id:'123',type:'abc'});
            should.deepEqual(n, flows.get("123"));
            flows.clear().then(function() {
                done();
            });
        });
    });

    describe('#each',function() {
        it('should "visit" all nodes',function(done) {
            var nodes = [
                new RedNode({id:'n0'}),
                new RedNode({id:'n1'})
            ];
            var count = 0;
            flows.each(function(node) {
                should.deepEqual(nodes[count], node);
                count += 1;
                if (count == 2) {
                    done();
                }
            });
        });
    });

    describe('#load',function() {
        it('should load nothing when storage is empty',function(done) {
            loadFlows([], done);
        });

        it('should load and start an empty tab flow',function(done) {
            loadFlows([{"type":"tab","id":"tab1","label":"Sheet 1"}], function() {});
            events.once('nodes-started', function() { done(); });
        });

        it('should load and start a registered node type', function(done) {
            RED.registerType('debug', function() {});
            var typeRegistryGet = sinon.stub(typeRegistry,"get",function(nt) {
                return function() {};
            });
            loadFlows([{"id":"n1","type":"debug"}], function() { });
            events.once('nodes-started', function() {
                typeRegistryGet.restore();
                done();
            });
        });

        it('should load and start when node type is registered', function(done) {
            var typeRegistryGet = sinon.stub(typeRegistry,"get");
            typeRegistryGet.onCall(0).returns(null);
            typeRegistryGet.returns(function(){});
            
            loadFlows([{"id":"n2","type":"inject"}], function() {
                events.emit('type-registered','inject');
            });
            events.once('nodes-started', function() {
                typeRegistryGet.restore();
                done();
            });
        });
    });

    describe('#setFlows',function() {
        it('should save and start an empty tab flow',function(done) {
            var saved = 0;
            var testFlows = [{"type":"tab","id":"tab1","label":"Sheet 1"}];
            var storage = {
                saveFlows: function(conf) {
                    var defer = when.defer();
                    defer.resolve();
                    should.deepEqual(testFlows, conf);
                    return defer.promise;
                },
                saveCredentials: function (creds) {
                    return when(true);
                }
            };
            RED.init(settings, storage);
            flows.setFlows(testFlows);
            events.once('nodes-started', function() { done(); });
        });
    });

});
