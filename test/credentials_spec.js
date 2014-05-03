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

var credentials = require("../red/nodes/credentials");

describe('Credentials', function() {
        
    it('loads from storage',function(done) {
        
        var storage = {
            getCredentials: function() {
                console.log("ONE");
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
            done();
        });
            
    });
            
})
        

