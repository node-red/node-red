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

var should = require('should');
var fs = require('fs-extra');
var path = require("path");
var when = require("when");
var LocalFileSystem = require('../../../../../red/runtime/nodes/context/localfilesystem');

var resourcesDir = path.resolve(path.join(__dirname,"..","resources","context"));

describe('localfilesystem',function() {
    var context;

    beforeEach(function() {
        context = LocalFileSystem({dir: resourcesDir});
        return context.open();
    });

    afterEach(function() {
        return context.close().then(function(){
            return fs.remove(resourcesDir);
        });
    });

    describe('#get/set',function() {
        it('should store property',function() {
            should.not.exist(context.get("nodeX","foo"));
            context.set("nodeX","foo","test");
            context.get("nodeX","foo").should.eql("test");
        });

        it('should store property - creates parent properties',function() {
            context.set("nodeX","foo.bar","test");
            context.get("nodeX","foo").should.eql({bar:"test"});
        });

        it('should delete property',function() {
            context.set("nodeX","foo.abc.bar1","test1");
            context.set("nodeX","foo.abc.bar2","test2");
            context.get("nodeX","foo.abc").should.eql({bar1:"test1",bar2:"test2"});
            context.set("nodeX","foo.abc.bar1",undefined);
            context.get("nodeX","foo.abc").should.eql({bar2:"test2"});
            context.set("nodeX","foo.abc",undefined);
            should.not.exist(context.get("nodeX","foo.abc"));
            context.set("nodeX","foo",undefined);
            should.not.exist(context.get("nodeX","foo"));
        });

        it('should not shared context with other scope', function() {
            should.not.exist(context.get("nodeX","foo"));
            should.not.exist(context.get("nodeY","foo"));
            context.set("nodeX","foo","testX");
            context.set("nodeY","foo","testY");

            context.get("nodeX","foo").should.eql("testX");
            context.get("nodeY","foo").should.eql("testY");
        });
    });

    describe('#keys',function() {
        it('should enumerate context keys', function() {
            var keys = context.keys("nodeX");
            keys.should.be.an.Array();
            keys.should.be.empty();

            context.set("nodeX","foo","bar");
            keys = context.keys("nodeX");
            keys.should.have.length(1);
            keys[0].should.eql("foo");

            context.set("nodeX","abc.def","bar");
            keys = context.keys("nodeX");
            keys.should.have.length(2);
            keys[1].should.eql("abc");
        });

        it('should enumerate context keys in each scopes', function() {
            var keysX = context.keys("nodeX");
            keysX.should.be.an.Array();
            keysX.should.be.empty();

            var keysY = context.keys("nodeY");
            keysY.should.be.an.Array();
            keysY.should.be.empty();

            context.set("nodeX","foo","bar");
            context.set("nodeY","hoge","piyo");
            keysX = context.keys("nodeX");
            keysX.should.have.length(1);
            keysX[0].should.eql("foo");

            keysY = context.keys("nodeY");
            keysY.should.have.length(1);
            keysY[0].should.eql("hoge");
        });
    });

    describe('#delete',function() {
        it('should delete context',function() {
            should.not.exist(context.get("nodeX","foo"));
            should.not.exist(context.get("nodeY","foo"));
            context.set("nodeX","foo","abc");
            context.set("nodeY","foo","abc");
            context.get("nodeX","foo").should.eql("abc");
            context.get("nodeY","foo").should.eql("abc");

            context.delete("nodeX");
            should.not.exist(context.get("nodeX","foo"));
            should.exist(context.get("nodeY","foo"));
        });
    });
});