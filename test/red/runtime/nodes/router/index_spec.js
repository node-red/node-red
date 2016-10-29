/**
 * Copyright 2016 IBM Corp.
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
var sinon = require('sinon');
var RedNode = require("../../../../../red/runtime/nodes/Node");
var router = require("../../../../../red/runtime/nodes/router");
var flows = require("../../../../../red/runtime/nodes/flows");


describe('Router', function() {
    var flowGet;
    afterEach(function() {
        if (flowGet && flowGet.restore) {
            flowGet.restore();
            flowGet = null;
        }
    })

    describe('#add',function() {
        it('adds a route for a node', function(done) {
            var senderNode = {id:'123',metric:function(){}};
            var receiver = sinon.stub();
            flowGet = sinon.stub(flows,"get",function(id) {
                if (id === '456') {
                    return {receive:receiver};
                }
                return null;
            });
            router.send(senderNode,{});
            flowGet.called.should.be.false();

            router.add(senderNode,[['456']]);

            router.send(senderNode,{});
            flowGet.called.should.be.true();
            receiver.called.should.be.true();

            done();
        });
    })

    describe('#remove',function() {
        it('removes a route for a node', function(done) {
            var senderNode = {id:'123',metric:function(){}};
            var receiver = sinon.stub();
            flowGet = sinon.stub(flows,"get",function(id) {
                if (id === '456') {
                    return {receive:receiver};
                }
                return null;
            });
            router.add(senderNode,[['456']]);
            router.send(senderNode,{});
            flowGet.called.should.be.true();
            receiver.called.should.be.true();
            flowGet.reset();
            receiver.reset();

            router.remove(senderNode);
            router.send(senderNode,{});
            flowGet.called.should.be.false();
            done();
        });
    })
})
