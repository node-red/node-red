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
var request = require("supertest");
var express = require("express");
var redUI = require("../../red/ui");


describe("red/ui icon handler", function() {
    it('returns the default icon when getting an unknown icon', function(done) {
        var app = express();
        redUI({},app);
        request(app)
            .get("/icons/youwonthaveme.png")
            .expect('Content-Type', /image\/png/)
            .expect(200)
            .end(function(err, res){
                if (err){
                    return done(err);
                }
                done();
              });
    });
    
    it('returns an icon from disk', function(done) {
        var app = express();
        redUI({},app);
        request(app)
            .get("/icons/arduino.png")
            .expect('Content-Type', /image\/png/)
            .expect(200)
            .end(function(err, res){
                if (err){
                    return done(err);
                }
                done();
              });
    });
});

describe("icon cache handler", function() {
    var fs = require('fs-extra');
    var path = require('path');
    var events = require("../../red/events");
    
    var tempDir = path.join(__dirname,".tmp/");
    var cachedFakePNG = tempDir + "cacheMe.png";
    
    
    beforeEach(function(done) {
        fs.remove(tempDir,function(err) {
            fs.mkdirSync(tempDir);
            fs.writeFileSync(cachedFakePNG, "Hello PNG\n");
            done();
        });     
    });
    afterEach(function(done) {
        fs.exists(cachedFakePNG, function(exists) {
          if(exists) {
              fs.unlinkSync(cachedFakePNG);
          } 
          fs.remove(tempDir,done);
        })
    });
    
    /*
     * This test case test that:
     * 1) any directory can be added to the path lookup (such as /tmp) by
     * calling the right event
     * 2) that a file we know exists gets cached so that the lookup/verification
     * of actual existence doesn't occur again when a subsequent request comes in
     * 
     * The second point verifies that the cache works. If the cache wouldn't work
     * the default PNG would be served
     */
    it('returns an icon using icon cache', function(done) {        
        var app = express();
        redUI({},app);
        events.emit("node-icon-dir", tempDir);
        request(app)
            .get("/icons/cacheMe.png")
            .expect('Content-Type', /image\/png/)
            .expect(200)
            .end(function(err, res){
                if (err){
                    return done(err);
                }
                fs.unlink(cachedFakePNG, function(err) {
                    if(err) {
                        return done(err);
                    }
                    request(app)
                    .get("/icons/cacheMe.png")
                    .expect('Content-Type', /text\/html/)
                    .expect(404)
                    .end(function(err, res){
                        if (err){
                            return done(err);
                        }
                        done();
                      });
                });
              });
    });
});

describe("red/ui settings handler", function() {
    it('returns the provided settings', function(done) {
        var settings = {
                httpNodeRoot: "testHttpNodeRoot",
                version: "testVersion",
        };
        var app = express();
        redUI(settings,app);
        request(app)
            .get("/settings")
            .expect('Content-Type', /application\/json/)
            .expect(200, "{\n  \"httpNodeRoot\": \"testHttpNodeRoot\",\n  \"version\": \"testVersion\"\n}")
            .end(function(err, res){
                if (err){
                    return done(err);
                }
                done();
            });
        
    });
});

describe("red/ui root handler", function() {
    it('server up the main page', function(done) {
        var app = express();
        redUI({},app);
        
        request(app)
            .get("/")
            .expect('Content-Type', /text\/html/)
            .expect(200)
            .end(function(err, res){
                if (err){
                    return done(err);
                }
                done();
            });
        
    });
    
    it('redirects to path ending with /', function(done) {
        var rapp = express();
        redUI({},rapp);

        var app = express().use('/root', rapp);
        
        request(app)
        .get("/root")
        .expect('Content-Type', /text\/plain/)
        .expect(302)
        .end(function(err, res){
            if (err){
                return done(err);
            }
            done();
          });
        
    });
});
