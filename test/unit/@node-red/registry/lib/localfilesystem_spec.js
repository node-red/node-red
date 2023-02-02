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

const should = require("should");
const sinon = require("sinon");
const path = require("path");

const NR_TEST_UTILS = require("nr-test-utils");

const localfilesystem = NR_TEST_UTILS.require("@node-red/registry/lib/localfilesystem");

const resourcesDir = path.resolve(path.join(__dirname,"resources","local"));
const userDir = path.resolve(path.join(__dirname,"resources","userDir"));

const nodesDir1 = path.resolve(path.join(__dirname,"resources","nodesDir1"))
const nodesDir2 = path.resolve(path.join(__dirname,"resources","nodesDir2"))
const nodesDir3 =path.resolve(path.join(__dirname,"resources","nodesDir3"))

const moduleDir = path.resolve(path.join(__dirname,"resources","local","TestNodeModule"));

const i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("red/nodes/registry/localfilesystem",function() {
    var stubs = [];
    function stubPathJoin() {
        var _join = path.join;
        stubs.push(sinon.stub(path,"join").callsFake(function() {
            if (arguments[0] == resourcesDir) {
                // This stops the module tree scan from going any higher
                // up the tree than resourcesDir.
                return arguments[0];
            }
            return _join.apply(null,arguments);
        }));
    }
    beforeEach(function() {
        stubs.push(sinon.stub(i18n,"registerMessageCatalog").callsFake(function() { return Promise.resolve(); }));
    })
    afterEach(function() {
        while(stubs.length) {
            stubs.pop().restore();
        }
    })
    function checkNodes(nodes,shouldHaveNodes,shouldNotHaveNodes,module) {
        for (var i=0;i<shouldHaveNodes.length;i++) {
            nodes.should.have.a.property(shouldHaveNodes[i]);
            nodes[shouldHaveNodes[i]].should.have.a.property('file');
	        nodes[shouldHaveNodes[i]].file.should.equal(path.resolve(nodes[shouldHaveNodes[i]].file));
            nodes[shouldHaveNodes[i]].should.have.a.property('module',module||'node-red');
            nodes[shouldHaveNodes[i]].should.have.a.property('name',shouldHaveNodes[i]);
        }
        for (i=0;i<shouldNotHaveNodes.length;i++) {
            nodes.should.not.have.a.property(shouldNotHaveNodes[i]);
        }
    }
    describe("#getNodeFiles",function() {
        it("Finds all the node files in the resources tree",function(done) {
            localfilesystem.init({coreNodesDir:resourcesDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            var nodes = nm.nodes;
            checkNodes(nm.nodes,['TestNode1','MultipleNodes1','NestedNode','TestNode2','TestNode3','TestNode4'],['TestNodeModule']);
            i18n.registerMessageCatalog.called.should.be.true();
            i18n.registerMessageCatalog.lastCall.args[0].should.eql('node-red');
            i18n.registerMessageCatalog.lastCall.args[1].should.eql(path.resolve(path.join(resourcesDir,"locales")));
            i18n.registerMessageCatalog.lastCall.args[2].should.eql('messages.json');
            done();
        });
        it("Includes node files from settings",function(done) {
            localfilesystem.init({nodesIncludes:['TestNode1.js'],coreNodesDir:resourcesDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode1'],['MultipleNodes1','NestedNode','TestNode2','TestNode3','TestNode4','TestNodeModule']);
            done();
        });
        it("Excludes node files from settings",function(done) {
            localfilesystem.init({nodesExcludes:['TestNode1.js'],coreNodesDir:resourcesDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['MultipleNodes1','NestedNode','TestNode2','TestNode3','TestNode4'],['TestNode1','TestNodeModule']);
            done();
        });
        it("Finds nodes in userDir/nodes",function(done) {
            localfilesystem.init({userDir:userDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });

        it("Finds nodes in settings.nodesDir (string)",function(done) {
            localfilesystem.init({nodesDir:userDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });
        it("Finds nodes in settings.nodesDir (string,relative path)",function(done) {
            var relativeUserDir = path.join("test","unit","@node-red","registry","lib","resources","userDir");
            localfilesystem.init({nodesDir:relativeUserDir});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });
        it("Finds nodes in settings.nodesDir (array)",function(done) {
            localfilesystem.init({nodesDir:[userDir]});
            var nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNode5'],['TestNode1']);
            done();
        });
        it("Finds nodes and icons only in nodesDir with files, icons and valid node-red packages",function(done) {
            localfilesystem.init({nodesDir:nodesDir1});
            const nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            const nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            nm.should.have.a.property("icons");
            checkNodes(nm.nodes,['loose1', 'loose2'], []);
            //1 icon in nodesDir1/icons/  - should be found
            //2 icons in nodesDir1/loose2/icons/  - should be found
            //1 icons in nodesDir1/node-red-node-testnode/icons/  - should be found
            //1 icons in nodesDir1/regular_module/icons/  - should NOT be found
            //total icon sets 3, total icons 4
            nm.icons.should.have.a.property("length", 3);
            nm.icons[0].should.have.a.property("path")
            nm.icons[0].should.have.a.property("icons", ['loose1.svg'])
            nm.icons[1].should.have.a.property("path")
            nm.icons[1].should.have.a.property("icons", ['loose2.svg', 'loose2b.svg'])
            nm.icons[2].should.have.a.property("path")
            nm.icons[2].should.have.a.property("icons", ['test.svg'])
            done();
        });
        it("Should not find node-red node in nodesDir with files, icons and valid node-red packages",function(done) {
            // path contains a regular node module and a node-red node module
            localfilesystem.init({nodesDir:path.join(nodesDir1)});
            const nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            const nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            nm.nodes.should.have.a.property("loose1");
            nm.nodes.should.have.a.property("loose2");
            nm.nodes.should.not.have.a.property("regular_module");
            nm.nodes.should.not.have.a.property("node-red-node-testnode");
            for (let key of Object.keys(nm.nodes)) {
                const n = nm.nodes[key];
                n.file.indexOf("regular_module").should.eql(-1, `found icons in a node-red module`)
                n.file.indexOf("node-red-node-testnode").should.eql(-1, `found icons in a node-red module`)
            }
            //1 icon in nodesDir1/icons/  - should be found
            //2 icons in nodesDir1/loose2/icons/  - should be found
            //1 icons in nodesDir1/node-red-node-testnode/icons/  - should be found
            //1 icons in nodesDir1/regular_module/icons/  - should NOT be found
            //total icon sets 3, total icons 4
            nm.should.have.a.property("icons");
            nm.icons.should.have.a.property("length", 3);
            let iconCount = 0;
            for (let index = 0; index < nm.icons.length; index++) {
                const iconDir = nm.icons[index];
                iconCount += iconDir.icons.length
                iconDir.path.indexOf("node-red-node-testnode").should.eql(-1, `should not find icons in a node-red module`)
            }
            should(iconCount).eql(4, "Should find only 4 icons")
            done();
        });
        it("Should not find node-red node in nodesDir when regular package and valid node-red packages",function(done) {
            localfilesystem.init({nodesDir:path.join(nodesDir1,"regular_module")});
            const nodeList = localfilesystem.getNodeFiles(true);
            nodeList.should.have.a.property("node-red");
            const nm = nodeList['node-red'];
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes", {});
            nm.should.have.a.property("icons");
            nm.icons.should.have.a.property("length", 1); //should find 1 icons folder
            nm.icons[0].should.have.a.property("icons", [ 'test.svg' ]); //should find 1 icon in regular package
            done();
        });
        it("Finds nodes module path",function(done) {
            stubPathJoin()
            localfilesystem.init({coreNodesDir:moduleDir});
            var nodeList = localfilesystem.getNodeFiles();
            nodeList.should.have.a.property("node-red");
            var nm = nodeList['node-red'];
            // The `node-red` module is loaded differently to those scanned for
            // It doesn't get the `path` property set. Maybe it should.
            nm.should.have.a.property('name','node-red');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,[],['TestNode1']);

            nm = nodeList['TestNodeModule'];
            nm.should.have.a.property('path')
            nm.should.have.a.property('name','TestNodeModule');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['TestNodeMod1','TestNodeMod2'],[],'TestNodeModule');

            nm = nodeList['VersionMismatchModule'];
            nm.should.have.a.property('path')
            nm.should.have.a.property('name','VersionMismatchModule');
            nm.should.have.a.property("nodes");
            checkNodes(nm.nodes,['VersionMismatchMod1','VersionMismatchMod2'],[],'VersionMismatchModule');

            i18n.registerMessageCatalog.called.should.be.true();
            i18n.registerMessageCatalog.lastCall.args[0].should.eql('node-red');
            i18n.registerMessageCatalog.lastCall.args[1].should.eql(path.resolve(path.join(moduleDir,"locales")));
            i18n.registerMessageCatalog.lastCall.args[2].should.eql('messages.json');

            done();
        });
        it.skip("finds locales directory");
        it.skip("finds icon path directory");
        it("scans icon files in the resources tree",function(done) {
            var count = 0;
            localfilesystem.init({
                coreNodesDir: resourcesDir
            });
            var list = localfilesystem.getNodeFiles(true);
            list.should.have.property("node-red");
            list["node-red"].should.have.property("icons");
            list["node-red"].icons.should.have.length(1);
            list["node-red"].icons[0].should.have.property("path",path.join(__dirname,"resources/local/NestedDirectoryNode/NestedNode/icons"))
            list["node-red"].icons[0].should.have.property("icons");
            list["node-red"].icons[0].icons.should.have.length(1);
            list["node-red"].icons[0].icons[0].should.eql("arrow-in.png");
            done();
        });
        it("scans icons dir in library",function(done) {
            var count = 0;
            localfilesystem.init({
                userDir: userDir
            });
            var list = localfilesystem.getNodeFiles(true);
            list.should.have.property("node-red");
            list["node-red"].should.have.property("icons");
            list["node-red"].icons.should.have.length(1);
            list["node-red"].icons[0].should.have.property("path",path.join(__dirname,"resources/userDir/lib/icons"))
            list["node-red"].icons[0].should.have.property("icons");
            list["node-red"].icons[0].icons.should.have.length(1);
            list["node-red"].icons[0].icons[0].should.eql("test_icon.png");
            done();
        });
    });
    describe("#getModuleFiles",function() {
        it("gets a nodes module files",function(done) {
            stubPathJoin()
            localfilesystem.init({coreNodesDir:moduleDir});
            var nodeModule = localfilesystem.getModuleFiles('TestNodeModule');
            nodeModule.should.have.a.property('TestNodeModule');
            nodeModule['TestNodeModule'].should.have.a.property('name','TestNodeModule');
            nodeModule['TestNodeModule'].should.have.a.property('version','0.0.1');
            nodeModule['TestNodeModule'].should.have.a.property('nodes');
            nodeModule['TestNodeModule'].should.have.a.property('path');

            checkNodes(nodeModule['TestNodeModule'].nodes,['TestNodeMod1','TestNodeMod2'],[],'TestNodeModule');

            nodeModule = localfilesystem.getModuleFiles('VersionMismatchModule');
            nodeModule.should.have.a.property('VersionMismatchModule');
            nodeModule['VersionMismatchModule'].should.have.a.property('redVersion','100.0.0');

            done();
        });
        it("Finds only 1 node-red node in nodesDir amongst legacy nodes and regular nodes",function(done) {
            stubPathJoin()
            localfilesystem.init({nodesDir:[path.join(nodesDir1,"node-red-node-testnode")]});
            const nodeModule = localfilesystem.getModuleFiles();
            const loaded = Object.keys(nodeModule)
            loaded.should.have.a.property("length", 1)
            loaded.indexOf('node-red-node-testnode').should.greaterThan(-1, "Should load node-red-node-testnode")

            nodeModule['node-red-node-testnode'].should.have.a.property('name','node-red-node-testnode');
            nodeModule['node-red-node-testnode'].should.have.a.property('version','1.0.0');
            nodeModule['node-red-node-testnode'].should.have.a.property('nodes');
            nodeModule['node-red-node-testnode'].should.have.a.property('path');
            nodeModule['node-red-node-testnode'].should.have.a.property('user', false);
            checkNodes(nodeModule['node-red-node-testnode'].nodes,['testnode'],[],'node-red-node-testnode');
            done();
        });
        it("Finds a node-red node in nodesDir with a sub dir containing valid node-red package",function(done) {
            stubPathJoin()
            localfilesystem.init({nodesDir:[path.join(nodesDir1,"node-red-node-testnode")]});
            const nodeModule = localfilesystem.getModuleFiles();
            const loaded = Object.keys(nodeModule)
            nodeModule['node-red-node-testnode'].should.have.a.property('name','node-red-node-testnode');
            nodeModule['node-red-node-testnode'].should.have.a.property('version','1.0.0');
            nodeModule['node-red-node-testnode'].should.have.a.property('nodes');
            nodeModule['node-red-node-testnode'].should.have.a.property('path');
            nodeModule['node-red-node-testnode'].should.have.a.property('user', false);
            checkNodes(nodeModule['node-red-node-testnode'].nodes,['testnode'],[],'node-red-node-testnode');
            done();
        });
        it("Finds 2 node-red modules and 1 plugin in nodesDir (in root of dir)",function(done) {
            stubPathJoin()
            localfilesystem.init({nodesDir:[nodesDir2]});
            const nodeModule = localfilesystem.getModuleFiles();
            const loaded = Object.keys(nodeModule)
            loaded.indexOf('@test/testnode').should.greaterThan(-1, "Should load @test/testnode")
            loaded.indexOf('lower-case').should.greaterThan(-1, "Should load lower-case")
            loaded.indexOf('@lowercase/lower-case2').should.greaterThan(-1, "Should load @lowercase/lower-case2")
            loaded.indexOf('testnode2').should.greaterThan(-1, "Should load testnode2")
            loaded.indexOf('test-theme2').should.greaterThan(-1, "Should load test-theme2")
            loaded.should.have.a.property("length", 5)

            // scoped module with nodes in same dir as package.json
            nodeModule['@test/testnode'].should.have.a.property('name','@test/testnode');
            nodeModule['@test/testnode'].should.have.a.property('version','1.0.0');
            nodeModule['@test/testnode'].should.have.a.property('nodes');
            nodeModule['@test/testnode'].should.have.a.property('path');
            nodeModule['@test/testnode'].should.have.a.property('user', false);

            // node-red module with nodes in sub dir
            nodeModule['@lowercase/lower-case2'].should.have.a.property('name','@lowercase/lower-case2');
            nodeModule['@lowercase/lower-case2'].should.have.a.property('version','2.0.0');
            nodeModule['@lowercase/lower-case2'].should.have.a.property('nodes');
            nodeModule['@lowercase/lower-case2'].nodes.should.have.a.property('lower-case');
            nodeModule['@lowercase/lower-case2'].should.have.a.property('path');
            nodeModule['@lowercase/lower-case2'].should.have.a.property('user', false);

            // scoped module with nodes in sub dir
            nodeModule['lower-case'].should.have.a.property('name', 'lower-case');
            nodeModule['lower-case'].should.have.a.property('version','1.0.0');
            nodeModule['lower-case'].should.have.a.property('nodes');
            nodeModule['lower-case'].nodes.should.have.a.property('lower-case');
            nodeModule['lower-case'].should.have.a.property('path');
            nodeModule['lower-case'].should.have.a.property('user', false);

            nodeModule['testnode2'].should.have.a.property('name','testnode2');
            nodeModule['testnode2'].should.have.a.property('version','1.0.0');
            nodeModule['testnode2'].should.have.a.property('nodes');
            nodeModule['testnode2'].should.have.a.property('path');
            nodeModule['testnode2'].should.have.a.property('user', false);

            nodeModule['test-theme2'].should.have.a.property('name','test-theme2');

            nodeModule['test-theme2'].should.have.a.property('version','0.0.1');
            nodeModule['test-theme2'].should.have.a.property('nodes', {});
            nodeModule['test-theme2'].should.have.a.property('path');
            nodeModule['test-theme2'].should.have.a.property('user', false);
            nodeModule['test-theme2'].should.have.a.property('plugins');
            nodeModule['test-theme2'].plugins.should.have.a.property('test-theme2');
            nodeModule['test-theme2'].plugins['test-theme2'].should.have.a.property('name','test-theme2');
            nodeModule['test-theme2'].plugins['test-theme2'].should.have.a.property('module','test-theme2');
            nodeModule['test-theme2'].plugins['test-theme2'].should.have.a.property('version', '0.0.1');
            nodeModule['test-theme2'].plugins['test-theme2'].should.have.a.property('file');
            nodeModule['test-theme2'].plugins['test-theme2'].should.have.a.property('local', false);

            done();
        });
        it("Finds 2 node-red modules and 1 plugin in nodesDir pointing to a node_modules dir",function(done) {
            stubPathJoin()
            localfilesystem.init({nodesDir:[path.join(nodesDir3, "node_modules")]});
            const nodeModule = localfilesystem.getModuleFiles();
            const loaded = Object.keys(nodeModule)
            loaded.should.have.a.property("length", 3)
            
            loaded.indexOf('@test/testnode').should.greaterThan(-1, "Should load @test/testnode")
            loaded.indexOf('@test/test-theme3').should.greaterThan(-1, "Should load test-theme3")
            loaded.indexOf('testnode3').should.greaterThan(-1, "Should load testnode3")
            done();
        });
        it("throws an error if a node isn't found",function(done) {
            stubPathJoin()
            localfilesystem.init({coreNodesDir:moduleDir});
            /*jshint immed: false */
            (function(){
                localfilesystem.getModuleFiles('WontExistModule');
            }).should.throw();
            done();
        });
        it.skip("finds locales directory");
        it.skip("finds icon path directory");
        it("scans icon files with a module file",function(done) {
            stubPathJoin()
            localfilesystem.init({
                coreNodesDir: moduleDir
            });
            var nodeModule = localfilesystem.getModuleFiles('TestNodeModule');
            nodeModule.should.have.property("TestNodeModule");
            nodeModule.TestNodeModule.should.have.property('icons');

            nodeModule.TestNodeModule.icons.should.have.length(1);
            nodeModule.TestNodeModule.icons[0].should.have.property("path");
            nodeModule.TestNodeModule.icons[0].should.have.property("icons");
            nodeModule.TestNodeModule.icons[0].icons[0].should.eql("arrow-in.png");
            done();
        });
    });
});
