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

/**
 * This test simply finds and requires every core JavaScript file. By requiring
 * the file, the test ensures that we have accurace code coverage statistics.
 */

var should = require("should");
var fs = require('fs');

//TODO call coverage on components other than the core!
var coverageParentDir = "./red"; // istambul is getting called from the node-red root directory!

/*
 * Simple utility to call require on all files and call the callback when done
 */
function requireAll(filesArray, done) {
    var errorCount = 0;
    for (var i = 0; i < filesArray.length; i++) {
        try {
            var variable = require("." + filesArray[i]); // have to append a . as the require is relative to the location of this .js file and not related to `pwd`
        } catch (e) {
            // intentionally ignored as some modules cannot be loaded without configuration but that shouldn't affect the coverage
        }
    }
    done();
}

function collectAndRequireAllJSFiles(fromDirectory, done) {
    walkDirectory(fromDirectory, function(err, filesArray) {
        if(err) {
            return done(err);
        }
        requireAll(filesArray, done);
    });
}

function endsWith(string, suffix) {
    var neverOccurs = -1;
    return string.indexOf(suffix, string.length - suffix.length) !== neverOccurs;
}

/*
 * Walk directory and append all files to an array. The resulting array
 * is offered to the function's callback.
 */
function walkDirectory(directory, done) {
    var results = [];
    fs.readdir(directory, function(err, list) {
        if (err) {
            return done(err);
        }
        var i = 0;
        function nextEntry() {
            var file = list[i++];
            if (!file) {
                return done(null, results);
            }
            file = directory + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walkDirectory(file, function(err, res) {
                        results = results.concat(res);
                        nextEntry();
                    });
                } else {
                    results.push(file);
                    nextEntry();
                }
            });
        }
        nextEntry();
    });
}

describe('CoverageDetector', function() {
    this.timeout(50000);
    it('is adding all JavaScript files into the code coverage report', function(done) {
        collectAndRequireAllJSFiles(coverageParentDir, done);
    });
});
