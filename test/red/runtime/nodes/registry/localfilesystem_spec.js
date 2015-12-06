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
var when = require("when");
var sinon = require("sinon");
var path = require("path");

var localfilesystem = require("../../../../../red/runtime/nodes/registry/localfilesystem");

var resourcesDir = path.resolve(path.join(__dirname,"..","resources","local"));
var userDir = path.resolve(path.join(__dirname,"..","resources","userDir"));
var moduleDir = path.resolve(path.join(__dirname,"..","resources","local","TestNodeModule"));

describe("red/nodes/registry/localfilesystem",function() {
    var stubs = [];
    afterEach(function() {
        while(stubs.length) {
            stubs.pop().restore();
        }
    })
    function checkNodes(nodes,shouldHaveNodes,shouldNotHaveNodes,module) {
        for (var i=0;i<shouldHaveNodes.length;i++) {
            nodes.should.have.a.property(shouldHaveNodes[i]);
            nodes[shouldHaveNodes[i]].should.have.a.property('file');
            nodes[shouldHaveNodes[i]].should.have.a.property('module',module||'node-red');
            nodes[shouldHaveNodes[i]].should.have.a.property('name',shouldHaveNodes[i]);
        }
        for (i=0;i<shouldNotHaveNodes.length;i++) {
            nodes.should.not.have.a.property(shouldNotHaveNodes[i]);
        }
    }
    describe("#getNodeFiles",function() {
        it("Finds all the node files in the resources tree",function(done) {
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{coreNodesDir:resourcesDir}});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            var nodes = nm.nodes;
            checkNodes(nm.nodes,['TestNode1','MultipleNodes1','NestedNode','TestNode2','TestNode3','TestNode4'],['TestNodeModule']);
            done();
        });
        it("Excludes node files from settings",function(done) {
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{nodesExcludes:['TestNode1.js'],coreNodesDir:resourcesDir}});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['MultipleNodes1','NestedNode','TestNode2','TestNode3','TestNode4'],['TestNode1','TestNodeModule']);
            done();
        });
        it("Finds nodes in userDir/nodes",function(done) {
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{userDir:userDir,coreNodesDir:__dirname}});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });

        it("Finds nodes in settings.nodesDir (string)",function(done) {
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{nodesDir:userDir,coreNodesDir:__dirname}});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });
        it("Finds nodes in settings.nodesDir (array)",function(done) {
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{nodesDir:[userDir],coreNodesDir:__dirname}});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });
        it("Finds nodes module path",function(done) {
            var _join = path.join;
            stubs.push(sinon.stub(path,"join",function() {
                if (arguments[0] == resourcesDir) {
                    // This stops the module tree scan from going any higher
                    // up the tree than resourcesDir.
                    return arguments[0];
                }
                return _join.apply(null,arguments);
            }));
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{coreNodesDir:moduleDir}});
            var nodeList = localfilesystem.getNodeFiles();
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,[],['TestNode1']);

            nm = nodeList['TestNodeModule'];
            nm.should.have.a.property('name','TestNodeModule');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNodeMod1','TestNodeMod2'],[],'TestNodeModule');

            nm = nodeList['VersionMismatchModule'];
            nm.should.have.a.property('name','VersionMismatchModule');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['VersionMismatchMod1','VersionMismatchMod2'],[],'VersionMismatchModule');

            done();
        });
        it.skip("finds locales directory");
        it.skip("finds icon path directory");

    });
    describe("#getModuleFiles",function() {
        it("gets a nodes module files",function(done) {
            var _join = path.join;
            stubs.push(sinon.stub(path,"join",function() {
                if (arguments[0] == resourcesDir) {
                    // This stops the module tree scan from going any higher
                    // up the tree than resourcesDir.
                    return arguments[0];
                }
                return _join.apply(null,arguments);
            }));
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{coreNodesDir:moduleDir}});
            var nodeModule = localfilesystem.getModuleFiles('TestNodeModule');
            nodeModule.should.have.a.property('TestNodeModule');
            nodeModule['TestNodeModule'].should.have.a.property('name','TestNodeModule');
            nodeModule['TestNodeModule'].should.have.a.property('version','0.0.1');
            nodeModule['TestNodeModule'].should.have.a.property('nodes');
            checkNodes(nodeModule['TestNodeModule'].nodes,['TestNodeMod1','TestNodeMod2'],[],'TestNodeModule');

            nodeModule = localfilesystem.getModuleFiles('VersionMismatchModule');
            nodeModule.should.have.a.property('VersionMismatchModule');
            nodeModule['VersionMismatchModule'].should.have.a.property('redVersion','100.0.0');

            done();
        });
        it("throws an error if a node isn't found",function(done) {
            var _join = path.join;
            stubs.push(sinon.stub(path,"join",function() {
                if (arguments[0] == resourcesDir) {
                    // This stops the module tree scan from going any higher
                    // up the tree than resourcesDir.
                    return arguments[0];
                }
                return _join.apply(null,arguments);
            }));
            localfilesystem.init({i18n:{registerMessageCatalog:function(){}},events:{emit:function(){}},settings:{coreNodesDir:moduleDir}});
            /*jshint immed: false */
            (function(){
                localfilesystem.getModuleFiles('WontExistModule');
            }).should.throw();
            done();
        });
        it.skip("finds locales directory");
        it.skip("finds icon path directory");
    });
});
