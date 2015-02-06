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
var Clients = require("../../../../red/api/auth/clients");

describe("Clients", function() {
    it('finds the known editor client',function(done) {
        Clients.get("node-red-editor").then(function(client) {
            client.should.have.property("id","node-red-editor");
            client.should.have.property("secret","not_available");
            done();
        });
    });
    it('finds the known admin client',function(done) {
        Clients.get("node-red-admin").then(function(client) {
            client.should.have.property("id","node-red-admin");
            client.should.have.property("secret","not_available");
            done();
        }).catch(function(err) {
            done(err);
        });
    });
    it('returns null for unknown client',function(done) {
        Clients.get("unknown-client").then(function(client) {
            should.not.exist(client);
            done();
        }).catch(function(err) {
            done(err);
        });
        
    });
});
            