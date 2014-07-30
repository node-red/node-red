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
var RedNodes = require("../../../red/nodes");

var RedNode = require("../../../red/nodes/Node");

describe('NodeRegistry', function() {
    it('automatically registers new nodes',function() {
        var testNode = RedNodes.getNode('123');
        should.not.exist(n);
        var n = new RedNode({id:'123',type:'abc'});
        
        var newNode = RedNodes.getNode('123');
        
        should.strictEqual(n,newNode);
    });
});

describe('NodeRegistry', function() {
    it('does not accept incorrect nodesDir',function(done) {
        var typeRegistry = require("../../../red/nodes/registry");
        var settings = {
                nodesDir : "wontexist"
        }

        typeRegistry.init(null);
        typeRegistry.load().then(function(){
            try {
                should.fail(null, null, "Loading of non-existing nodesDir should never succeed");
            } catch (err) {
                done(err);
            }
        }).catch(function(e) { // successful test, failed promise
            done();
        });
    });
    
    it('fails to load additional node files from invalid nodesDir',function(done) {
        var typeRegistry = require("../../../red/nodes/registry");
        var settings = {
                nodesDir : "wontexist"
        }

        typeRegistry.init(settings);
        typeRegistry.load().then(function(){
            try {
                should.fail(null, null, "Loading of non-existing nodesDir should never succeed");
            } catch (err) {
                done(err);
            }
        }).catch(function(e) { // successful test, failed promise
            done();
        });
    });
});

/*
 * This test does the following:
 * 1) injects settings that tell the registry to load its default nodes from 
 * tempNoNodesContainedDir that contains no valid nodes => this means that no default nodes are loaded
 * 2) We only load a single node we pre-deploy into tempDir
 * 3) This node (fakeNodeJS = reads "fake Node JavaScript"), when exported automatically creates a known
 * file
 * 4) We can assert that this file exists and make the loading test pass/fail 
 */
describe("getNodeFiles", function() {
    var fs = require('fs-extra');
    var path = require('path');
    
    var tempDir = path.join(__dirname,".tmp/");
    var fakeNodeJS = tempDir + "testNode.js"; //  when exported, this fake node creates a file we can assert on
    
    var nodeInjectedFileName = "testInjected";
    var nodeInjectedFilePath = path.join(tempDir, nodeInjectedFileName);
    
    var tempNoNodesContainedDir = path.join(__dirname,".noNodes/"); 

    beforeEach(function(done) {
        fs.remove(tempDir,function(err) {
            fs.mkdirSync(tempDir);
            var fileContents =     "var fs = require('fs');\n" +
                                    "var path = require('path');\n" +
                                    "var tempFile = path.join(__dirname, \"" + nodeInjectedFileName + "\");\n" +
                                    "\n" +
                                    "module.exports = function(RED) {\n" +
                                    "        fs.writeFileSync(tempFile, \"Test passes if this file has been written.\");\n" +
                                    "}\n";
            fs.writeFileSync(fakeNodeJS, fileContents);
            fs.remove(tempNoNodesContainedDir,function(err) {
                fs.mkdirSync(tempNoNodesContainedDir);
                done();
            });     
        });   
    });
    afterEach(function(done) {
        fs.exists(tempNoNodesContainedDir, function(exists) {
           if(exists) {
               fs.removeSync(tempNoNodesContainedDir);
           } 
        });
        fs.exists(nodeInjectedFilePath, function(exists) {
            if(exists) {
                fs.unlinkSync(nodeInjectedFilePath);
            } 
          });
        fs.exists(fakeNodeJS, function(exists) {
          if(exists) {
              fs.unlinkSync(fakeNodeJS);
          } 
          fs.remove(tempDir, done);
        });
    });
    
    it('loads additional node files from specified external nodesDir',function(done) {
        var typeRegistry = require("../../../red/nodes/registry");
        var settings = {
                nodesDir : tempDir
        }

        typeRegistry.init(settings);
        
        typeRegistry.load(tempNoNodesContainedDir).then(function(){
            fs.exists(nodeInjectedFilePath, function(exists) {
               if(exists) {
                   done();
               } else {
                   try {
                       should.fail(null, null, nodeInjectedFilePath + " should be created by registered test node.");   
                   } catch(err) {
                       done(err)
                   }
               }
            });
        }).catch(function(e) {
            try {
                should.fail(null, null, "Loading of nodesDir should succeed");
            } catch (err) {
                done(err);
            }
        });
    });
});
