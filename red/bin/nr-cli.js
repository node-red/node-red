#!/usr/bin/env node
;(function() {
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
 
 
var request = require("request");
var colors = require('colors');


function formatBoolean(v,c) {
    if (v) {
        return ("["+c+"]");
    } else {
        return ("[ ]");
    }
}

function formatNodeInfo(n) {
    var inError = n.hasOwnProperty("err");
    
    var str = formatBoolean(n.enabled,"X")+formatBoolean(n.loaded,"L")+" ";
    str += n.id;
    if (n.enabled && n.loaded) {
        str = str.green;
    } else if (n.enabled && n.err) {
        str = str.red;
    } else {
        str = str.yellow;
    }
    if (n.module) {
        str += " ["+n.module+"]";
    }
    str += " "+n.types.join(", ");
    if (n.err) {
        str+=" "+n.err.red;
    }
    return str;
}
var options;

if (process.argv[2] == "nodes") {
    
    options = {
        url: 'http://localhost:1880/nodes',
        headers: {
           'Accept': 'application/json'
        }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            for (var i=0;i<info.length;i++) {
                var n = info[i];
                console.log(formatNodeInfo(n))
            }
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
} else if (process.argv[2] == "node" && process.argv[3]) {
    options = {
        url: 'http://localhost:1880/nodes/'+process.argv[3],
        headers: {
           'Accept': 'application/json'
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            console.log(formatNodeInfo(info));
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
} else if (process.argv[2] == "enable-node" && process.argv[3]) {
    options = {
        method: "PUT",
        url: 'http://localhost:1880/nodes/'+process.argv[3],
        headers: {
           'Accept': 'application/json',
           'content-type':'application/json'
        },
        body: JSON.stringify({enabled:true})
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            console.log(formatNodeInfo(info));
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
} else if (process.argv[2] == "disable-node" && process.argv[3]) {
    options = {
        method: "PUT",
        url: 'http://localhost:1880/nodes/'+process.argv[3],
        headers: {
           'Accept': 'application/json',
           'content-type':'application/json'
        },
        body: JSON.stringify({enabled:false})
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            console.log(formatNodeInfo(info));
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
} else if (process.argv[2] == "install" && process.argv[3]) {
    options = {
        method: "POST",
        url: 'http://localhost:1880/nodes',
        headers: {
           'Accept': 'application/json',
           'content-type':'application/json'
        },
        body: JSON.stringify({module:process.argv[3]})
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            for (var i=0;i<info.length;i++) {
                var n = info[i];
                console.log(formatNodeInfo(n))
            }            
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
} else if (process.argv[2] == "remove" && process.argv[3]) {
    options = {
        method: "DELETE",
        url: 'http://localhost:1880/nodes/'+process.argv[3],
        headers: {
           'Accept': 'application/json',
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            for (var i=0;i<info.length;i++) {
                var n = info[i];
                console.log(formatNodeInfo(n))
            }            
        } else if (error) {
            console.log(error.toString().red);
        } else {
            console.log((response.statusCode+": "+body).red);
        }
    });
}
})();
