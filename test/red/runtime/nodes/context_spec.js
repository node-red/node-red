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
var sinon = require('sinon');
var Context = require("../../../../red/runtime/nodes/context");

describe('context', function() {
    beforeEach(function() {
        Context.init({});
    });
    afterEach(function() {
        Context.clean({allNodes:{}});
    });
    it('stores local property',function() {
        var context1 = Context.get("1","flowA");
        should.not.exist(context1.get("foo"));
        context1.set("foo","test");
        context1.get("foo").should.eql("test");
    });
    it('stores local property - creates parent properties',function() {
        var context1 = Context.get("1","flowA");
        context1.set("foo.bar","test");
        context1.get("foo").should.eql({bar:"test"});
    });
    it('deletes local property',function() {
        var context1 = Context.get("1","flowA");
        context1.set("foo.abc.bar1","test1");
        context1.set("foo.abc.bar2","test2");
        context1.get("foo.abc").should.eql({bar1:"test1",bar2:"test2"});
        context1.set("foo.abc.bar1",undefined);
        context1.get("foo.abc").should.eql({bar2:"test2"});
        context1.set("foo.abc",undefined);
        should.not.exist(context1.get("foo.abc"));
        context1.set("foo",undefined);
        should.not.exist(context1.get("foo"));
    });
    it('stores flow property',function() {
        var context1 = Context.get("1","flowA");
        should.not.exist(context1.flow.get("foo"));
        context1.flow.set("foo","test");
        context1.flow.get("foo").should.eql("test");
    });
    it('stores global property',function() {
        var context1 = Context.get("1","flowA");
        should.not.exist(context1.global.get("foo"));
        context1.global.set("foo","test");
        context1.global.get("foo").should.eql("test");
    });

    it('keeps local context local', function() {
        var context1 = Context.get("1","flowA");
        var context2 = Context.get("2","flowA");

        should.not.exist(context1.get("foo"));
        should.not.exist(context2.get("foo"));
        context1.set("foo","test");

        context1.get("foo").should.eql("test");
        should.not.exist(context2.get("foo"));
    });
    it('flow context accessible to all flow nodes', function() {
        var context1 = Context.get("1","flowA");
        var context2 = Context.get("2","flowA");

        should.not.exist(context1.flow.get("foo"));
        should.not.exist(context2.flow.get("foo"));

        context1.flow.set("foo","test");
        context1.flow.get("foo").should.eql("test");
        context2.flow.get("foo").should.eql("test");
    });

    it('flow context not shared to nodes on other flows', function() {
        var context1 = Context.get("1","flowA");
        var context2 = Context.get("2","flowB");

        should.not.exist(context1.flow.get("foo"));
        should.not.exist(context2.flow.get("foo"));

        context1.flow.set("foo","test");
        context1.flow.get("foo").should.eql("test");
        should.not.exist(context2.flow.get("foo"));
    });

    it('global context shared to all nodes', function() {
        var context1 = Context.get("1","flowA");
        var context2 = Context.get("2","flowB");

        should.not.exist(context1.global.get("foo"));
        should.not.exist(context2.global.get("foo"));

        context1.global.set("foo","test");
        context1.global.get("foo").should.eql("test");
        context2.global.get("foo").should.eql("test");
    });

});
