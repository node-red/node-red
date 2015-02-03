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
var util = require("util");

var index = require("../../../red/nodes/index");
var credentials = require("../../../red/nodes/credentials");
var log = require("../../../red/log");

describe('Credentials', function() {
    
    afterEach(function() {
        index.clearRegistry();
    });
    
    it('loads from storage',function(done) {
        
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            }
        };
        
        credentials.init(storage);
        
        credentials.load().then(function() {
                
            credentials.get("a").should.have.property('b',1);
            credentials.get("a").should.have.property('c',2);
            
            done();
        });
    });
    
    
    it('saves to storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.not.exist(credentials.get("b"))
            credentials.add('b',{"d":3});
            storage.saveCredentials.callCount.should.be.exactly(1);
            credentials.get("b").should.have.property('d',3);
            storage.saveCredentials.restore();
            done();
        });
    });
    
    it('deletes from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.exist(credentials.get("a"))
            credentials.delete('a');
            storage.saveCredentials.callCount.should.be.exactly(1);
            should.not.exist(credentials.get("a"));
            storage.saveCredentials.restore();
            done();
        });
            
    });
            
    it('clean up from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    resolve({"a":{"b":1,"c":2}});
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        sinon.spy(storage,"saveCredentials");
        credentials.init(storage);
        credentials.load().then(function() {
            should.exist(credentials.get("a"));
            credentials.clean([]);
            storage.saveCredentials.callCount.should.be.exactly(1);
            should.not.exist(credentials.get("a"));
            storage.saveCredentials.restore();
            done();
        });
    });
    
    it('handle error loading from storage', function(done) {
        var storage = {
            getCredentials: function() {
                return when.promise(function(resolve,reject) {
                    reject("test forcing failure");
                });
            },
            saveCredentials: function(creds) {
                return when(true);
            }
        };
        var logmsg = 'nothing logged yet';
        sinon.stub(log, 'warn', function(msg) {
            logmsg = msg;
        });
        
        credentials.init(storage);
        credentials.load().then(function() {
            logmsg.should.equal("Error loading credentials : test forcing failure");
            log.warn.restore();
            done();
        }).otherwise(function(err){
            log.warn.restore();
            done(err);
        });
    });
    
    it('credential type is not registered when extract', function(done) {
        var testFlows = [{"type":"test","id":"tab1","label":"Sheet 1"}];
        var storage = {
                getFlows: function() {
                    var defer = when.defer();
                    defer.resolve(testFlows);
                    return defer.promise;
                },
                getCredentials: function() {
                    return when.promise(function(resolve,reject) {
                        resolve({"tab1":{"b":1,"c":2}});
                    });
                },
                saveFlows: function(conf) {
                    var defer = when.defer();
                    defer.resolve();
                    should.deepEqual(testFlows, conf);
                    return defer.promise;
                },
                saveCredentials: function(creds) {
                    return when(true);
                },
                getSettings: function() {
                    return when({});
                },
                saveSettings: function(s) {
                    return when();
                }
        };
        function TestNode(n) {
            index.createNode(this, n);
            
            this.id = 'tab1';
            this.type = 'test';
            this.name = 'barney';
            var node = this;

            this.on("log", function() {
                // do nothing
            });
        }
        var logmsg = 'nothing logged yet';
        sinon.stub(log, 'warn', function(msg) {
            logmsg = msg;
        });
        var settings = {
            available: function() { return false;}
        }
        index.init(settings, storage);
        index.registerType('test', TestNode);   
        index.loadFlows().then(function() {
            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});   
            credentials.extract(testnode);
            should.equal(logmsg, 'Credential Type test is not registered.');
            log.warn.restore();
            done();
        }).otherwise(function(err){
            log.warn.restore();
            done(err);
        });
    });
    
    //describe('extract and store credential updates in the provided node', function() {
    //    var path = require('path');
    //    var fs = require('fs-extra');
    //    var http = require('http');
    //    var express = require('express');
    //    var server = require("../../../red/server");
    //    var localfilesystem = require("../../../red/storage/localfilesystem");
    //    var app = express();
    //    var RED = require("../../../red/red.js");
    //    
    //    var userDir = path.join(__dirname,".testUserHome");
    //    before(function(done) {
    //        fs.remove(userDir,function(err) {
    //            fs.mkdir(userDir,function() {
    //                sinon.stub(index, 'load', function() {
    //                    return when.promise(function(resolve,reject){
    //                        resolve([]);
    //                    });
    //                });
    //                sinon.stub(localfilesystem, 'getCredentials', function() {
    //                     return when.promise(function(resolve,reject) {
    //                            resolve({"tab1":{"foo": 2, "pswd":'sticks'}});
    //                     });
    //                }) ;
    //                RED.init(http.createServer(function(req,res){app(req,res)}),
    //                         {userDir: userDir});
    //                server.start().then(function () {
    //                    done(); 
    //                 });
    //            });
    //        });
    //    });
    //
    //    after(function(done) {
    //        fs.remove(userDir,done);
    //        server.stop();
    //        index.load.restore();
    //        localfilesystem.getCredentials.restore();
    //    });
    //
    //    function TestNode(n) {
    //        index.createNode(this, n);
    //        var node = this;
    //        this.on("log", function() {
    //            // do nothing
    //        });
    //    }
    //    
    //    it(': credential updated with good value', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});   
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.have.property('foo',2);
    //            
    //            // set credentials to be an updated value and checking this is extracted properly
    //            testnode.credentials = {"foo": 3};
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.not.have.property('foo',2);
    //            credentials.get('tab1').should.have.property('foo',3);
    //            done();                    
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //
    //    it(': credential updated with empty value', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});   
    //            // setting value of "foo" credential to be empty removes foo as a property
    //            testnode.credentials = {"foo": ''};
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.not.have.property('foo',2);
    //            credentials.get('tab1').should.not.have.property('foo');
    //            done();                    
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //
    //    it(': undefined credential updated', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'test',name:'barney'});   
    //            // setting value of an undefined credential should not change anything
    //            testnode.credentials = {"bar": 4};
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.have.property('foo',2);
    //            credentials.get('tab1').should.not.have.property('bar');
    //            done();                    
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //    
    //    it(': password credential updated', function(done) {
    //        index.registerType('password', TestNode, {
    //            credentials: {
    //                pswd: {type:"password"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'password',name:'barney'});   
    //            // setting value of password credential should update password 
    //            testnode.credentials = {"pswd": 'fiddle'};
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.have.property('pswd','fiddle');
    //            credentials.get('tab1').should.not.have.property('pswd','sticks');
    //            done();                    
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });    
    //
    //    it(': password credential not updated', function(done) {
    //        index.registerType('password', TestNode, {
    //            credentials: {
    //                pswd: {type:"password"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'password',name:'barney'});   
    //            // setting value of password credential should update password 
    //            testnode.credentials = {"pswd": '__PWRD__'};
    //            credentials.extract(testnode);
    //            should.exist(credentials.get('tab1'));
    //            credentials.get('tab1').should.have.property('pswd','sticks');
    //            credentials.get('tab1').should.not.have.property('pswd','__PWRD__');
    //            done();                    
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });    
    //
    //})

    //describe('registerEndpoint', function() {
    //    var path = require('path');
    //    var fs = require('fs-extra');
    //    var http = require('http');
    //    var express = require('express');
    //    var request = require('supertest');
    //    
    //    var server = require("../../../red/server");
    //    var localfilesystem = require("../../../red/storage/localfilesystem");
    //    var app = express();
    //    var RED = require("../../../red/red.js");
    //    
    //    var userDir = path.join(__dirname,".testUserHome");
    //    before(function(done) {
    //        fs.remove(userDir,function(err) {
    //            fs.mkdir(userDir,function() {
    //                sinon.stub(index, 'load', function() {
    //                    return when.promise(function(resolve,reject){
    //                        resolve([]);
    //                    });
    //                });
    //                sinon.stub(localfilesystem, 'getCredentials', function() {
    //                     return when.promise(function(resolve,reject) {
    //                            resolve({"tab1":{"foo": 2, "pswd":'sticks'}});
    //                     });
    //                }) ;
    //                RED.init(http.createServer(function(req,res){app(req,res)}),
    //                         {userDir: userDir});
    //                server.start().then(function () {
    //                    done(); 
    //                 });
    //            });
    //        });
    //    });
    //
    //    after(function(done) {
    //        fs.remove(userDir,done);
    //        server.stop();
    //        index.load.restore();
    //        localfilesystem.getCredentials.restore();
    //    });
    //
    //    function TestNode(n) {
    //        index.createNode(this, n);
    //        var node = this;
    //        this.on("log", function() {
    //            // do nothing
    //        });
    //    }
    //    
    //    it(': valid credential type', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'foo',name:'barney'});   
    //            request(RED.httpAdmin).get('/credentials/test/tab1').expect(200).end(function(err,res) {
    //                if (err) {
    //                    done(err);
    //                }
    //                res.body.should.have.property('foo', 2);
    //                done();
    //            });              
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //    
    //    it(': password credential type', function(done) {
    //        index.registerType('password', TestNode, {
    //            credentials: {
    //                pswd: {type:"password"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'pswd',name:'barney'});   
    //            request(RED.httpAdmin).get('/credentials/password/tab1').expect(200).end(function(err,res) {
    //                if (err) {
    //                    done(err);
    //                }
    //                res.body.should.have.property('has_pswd', true);
    //                res.body.should.not.have.property('pswd');
    //                done();
    //            });              
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });    
    //    
    //    it(': returns 404 for undefined credential type', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'foo',name:'barney'});   
    //            request(RED.httpAdmin).get('/credentials/unknownType/tab1').expect(404).end(done);              
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //    
    //    it(': undefined nodeID', function(done) {
    //        index.registerType('test', TestNode, {
    //            credentials: {
    //                foo: {type:"test"}
    //            }
    //        });   
    //        index.loadFlows().then(function() {
    //            var testnode = new TestNode({id:'tab1',type:'foo',name:'barney'});   
    //            request(RED.httpAdmin).get('/credentials/test/unknownNode').expect(200).end(function(err,res) {
    //                if (err) {
    //                    done(err);
    //                }
    //                var b = res.body;
    //                res.body.should.not.have.property('foo');
    //                done();
    //            });              
    //        }).otherwise(function(err){
    //            done(err);
    //        });
    //    });
    //    
    //})        
    
})     

