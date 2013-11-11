/**
 * Copyright 2013 IBM Corp.
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
 
 
var settings;
var storage;

module.exports = {
    init: function(_settings) {
        settings = _settings;
        
        var storageType = settings.storageModule || "localfilesystem";
        
        storage = require("./"+storageType).init(settings);
        return storage;
    },
};

module.exports.__defineGetter__("storage", function() { return storage; });

