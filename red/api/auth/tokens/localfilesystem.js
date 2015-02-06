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

var fs = require('fs');
var when = require('when');
var nodeFn = require('when/node/function');
var fspath = require("path");

var settings;
var sessionsFile;

var sessions = {};

/** 
 * Write content to a file using UTF8 encoding.
 * This forces a fsync before completing to ensure
 * the write hits disk.
 */
function writeFile(path,content) {
    return when.promise(function(resolve,reject) {
        var stream = fs.createWriteStream(path);
        stream.on('open',function(fd) {
            stream.end(content,'utf8',function() {
                fs.fsync(fd,resolve);
            });
        });
        stream.on('error',function(err) {
            reject(err);
        });
    });
}

var api = module.exports = {
    init: function(_settings) {
        settings = _settings;
        var userDir = settings.userDir || process.env.NODE_RED_HOME;
        sessionsFile = fspath.join(userDir,".sessions.json");
        
        try {
            sessions = JSON.parse(fs.readFileSync(sessionsFile,'utf8'));
        } catch(err) {
            sessions = {};
        }
        
        return when.resolve();
    },
    
    get: function(token) {
        return when.resolve(sessions[token]);
    },
    create: function(token,session) {
        sessions[token] = session;
        return writeFile(sessionsFile,JSON.stringify(sessions));
    },
    delete: function(token) {
        delete sessions[token];
        return writeFile(sessionsFile,JSON.stringify(sessions));
    }
}
