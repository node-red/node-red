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
var NR_TEST_UTILS = require("nr-test-utils");
var i18n = NR_TEST_UTILS.require("@node-red/util").i18n;

describe("@node-red/util/i18n", function() {

    const path = require('path');
    const fs = require('fs-extra');

    it('ensures fallback file has the mqtt.label.protocolversion key', function() {

        var enUS = require(path.resolve(__dirname, '../../../../../packages/node_modules/@node-red/nodes/locales/en-US/messages.json'));
        var keys = deepKeys(enUS, []);
        true.should.equal(keys.indexOf('mqtt.label.protocolversion') > -1);
    });

    it.skip('ensures all messages.json files have the same keys', function() {
        //fails, but because we do a fallback to en-us this is ok
        //leaving this here in case we want to be able to use this to review translation coverage
        let results = getFiles('../../../../../packages/node_modules/@node-red/nodes/locales')
            .map((path) => {
                //grab the paths
                var paths = deepKeys(require(path), []);
                return paths.join('');
            })
            .filter((paths, pos, arr) => {
                //dedup
                return arr.indexOf(paths) == pos;
            });
        //should only have one set of paths
        results.length.should.equal(1);
    });

    it.skip('more tests needed', function() {});

    //helper functions

    function getFile(relativePath) {
        let basePath = path.resolve(__dirname, relativePath);
        return fs.readdirSync(basePath)
            .map(function(path) {
                return [basePath, path, 'messages.json'].join('/');
            });
    }

    function getFiles(relativePath, regex) {
        let basePath = path.resolve(__dirname, relativePath);
        return fs.readdirSync(basePath)
            .map(function(path) {
                return [basePath, path, 'messages.json'].join('/');
            });
    }

    //grabbed from deep-keys: https://github.com/a8m/deep-keys
    //not certain of maintainer
    function deepKeys(obj, stack, parent, intermediate) {
        Object.keys(obj).forEach(function(el) {
            // Escape . in the element name
            var escaped = el.replace(/\./g, '\\\.');
            // If it's a nested object
            if (isObject(obj[el]) && !Array.isArray(obj[el])) {
                // Concatenate the new parent if exist
                var p = parent ? parent + '.' + escaped : parent;
                // Push intermediate parent key if flag is true
                if (intermediate) {
                    stack.push(parent ? p : escaped);
                }
                deepKeys(obj[el], stack, p || escaped, intermediate);
            } else {
                // Create and save the key
                var key = parent ? parent + '.' + escaped : escaped;
                stack.push(key)
            }
        });
        return stack;
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !(value instanceof Date);
    }
});
