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
 
var when = require("when");
var request = require("request");
var config = require("./config");

module.exports = function(path, options) {
    var basePath = config.target;
    return when.promise(function(resolve,reject) {
        options.headers = options.headers||{};
        options.headers['Accept'] = 'application/json';
        if (options.method == 'PUT' || options.method == "POST") {
            options.headers['content-type'] = 'application/json';
        }
        options.url = basePath+path;
        
        // Pull out the request function so we can stub it in the tests
        var requestFunc = request.get;
        
        if (options.method == 'PUT') {
            requestFunc = request.put;
        } else if (options.method == 'POST') {
            requestFunc = request.post;
        } else if (options.method == 'DELETE') {
            requestFunc = request.del;
        }
        requestFunc(options, function(error,response,body) {
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body));
            } else if (error) {
                reject(error.toString());
            } else {
                reject(response.statusCode+": "+body)
            }
        });
    });
}
