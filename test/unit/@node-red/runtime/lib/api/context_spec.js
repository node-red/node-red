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
var sinon = require("sinon");

var NR_TEST_UTILS = require("nr-test-utils");
var context = NR_TEST_UTILS.require("@node-red/runtime/lib/api/context")

var mockLog = () => ({
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
})

var mockContext = function(contents) {
    return {
        get: function(key,store,callback) {
            if (contents.hasOwnProperty(store) && contents[store].hasOwnProperty(key)) {
                callback(null,contents[store][key]);
            } else {
                callback(null,undefined);
            }
        },
        keys: function(store,callback) {
            if (contents.hasOwnProperty(store)) {
                callback(null,Object.keys(contents[store]));
            } else {
                callback("err store");
            }
        }
    }
}
describe("runtime-api/context", function() {
    describe("getValue", function() {
        var contexts = {
            global: mockContext({ default: {abc:111}, file: {abc:222}}),
            flow1: mockContext({ default: {abc:333}, file: {abc:444}})
        }
        var nodeContext = mockContext({ default: {abc:555}, file: {abc:666}})

        beforeEach(function() {
            context.init({
                nodes: {
                    listContextStores: function() {
                        return { default: 'default', stores: [ 'default', 'file' ] }
                    },
                    getContext: function(id) {
                        return contexts[id]
                    },
                    getNode: function(id) {
                        if (id === 'known') {
                            return {
                                context: function() { return nodeContext }
                            }
                        } else {
                            return null;
                        }
                    }
                },
                settings: {
                    functionGlobalContext: {
                        fgc:1234
                    }
                },
                log: mockLog()
            })
        });

        it('gets global value of default store', function() {
            return context.getValue({
                scope: 'global',
                id: undefined,
                store: undefined, // use default
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','111');
                result.should.have.property('format','number');
            })
        })
        it('gets global value of specified store', function() {
            return context.getValue({
                scope: 'global',
                id: undefined,
                store: 'file',
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','222');
                result.should.have.property('format','number');
            })
        })
        it('gets flow value of default store', function() {
            return context.getValue({
                scope: 'flow',
                id: 'flow1',
                store: undefined, // use default
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','333');
                result.should.have.property('format','number');
            })
        })
        it('gets flow value of specified store', function() {
            return context.getValue({
                scope: 'flow',
                id: 'flow1',
                store: 'file',
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','444');
                result.should.have.property('format','number');
            })
        })
        it('gets node value of default store', function() {
            return context.getValue({
                scope: 'node',
                id: 'known',
                store: undefined, // use default
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','555');
                result.should.have.property('format','number');
            })
        })
        it('gets node value of specified store', function() {
            return context.getValue({
                scope: 'node',
                id: 'known',
                store: 'file',
                key: 'abc'
            }).then(function(result) {
                result.should.have.property('msg','666');
                result.should.have.property('format','number');
            })
        })

        it('404s for unknown store', function(done) {
            context.getValue({
                scope: 'global',
                id: undefined,
                store: 'unknown',
                key: 'abc'
            }).then(function(result) {
                done("getValue for unknown store should not resolve");
            }).catch(function(err) {
                err.should.have.property('code','not_found')
                err.should.have.property('status',404);
                done();
            })
        })


        it('gets all global value properties', function() {
            return context.getValue({
                scope: 'global',
                id: undefined,
                store: undefined, // use default
                key: undefined, //
            }).then(function(result) {
                result.should.eql({
                    default: { abc: { msg: '111', format: 'number' } },
                    file: { abc: { msg: '222', format: 'number' } }
                });
            })
        })
        it('gets all flow value properties', function() {
            return context.getValue({
                scope: 'flow',
                id: 'flow1',
                store: undefined, // use default
                key: undefined, //
            }).then(function(result) {
                result.should.eql({
                    default: { abc: { msg: '333', format: 'number' } },
                    file: { abc: { msg: '444', format: 'number' } }
                });
            })
        })
        it('gets all node value properties', function() {
            return context.getValue({
                scope: 'node',
                id: 'known',
                store: undefined, // use default
                key: undefined, //
            }).then(function(result) {
                result.should.eql({
                    default: { abc: { msg: '555', format: 'number' } },
                    file: { abc: { msg: '666', format: 'number' } }
                });
            })
        })

    })
});
