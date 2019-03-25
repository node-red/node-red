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

var net = require("net");
var fs = require("fs-extra");
var path = require("path");
var os = require("os");

function getListenPath() {
    var seed = (0x100000+Math.random()*0x999999).toString(16);
    var fn = 'node-red-git-askpass-'+seed+'-sock';
    var listenPath;
    if (process.platform === 'win32') {
        listenPath = '\\\\.\\pipe\\'+fn;
    } else {
        listenPath = path.join(process.env['XDG_RUNTIME_DIR'] || os.tmpdir(), fn);
    }
    // console.log(listenPath);
    return listenPath;
}



var ResponseServer = function(auth) {
    return new Promise(function(resolve, reject) {
        var server = net.createServer(function(connection) {
            connection.setEncoding('utf8');
            var parts = [];
            connection.on('data', function(data) {
                var m = data.indexOf("\n");
                if (m !== -1) {
                    parts.push(data.substring(0, m));
                    data = data.substring(m);
                    var line = parts.join("");
                    // console.log("LINE:",line);
                    parts = [];
                    if (line==='Username') {
                        connection.end(auth.username);
                    } else if (line === 'Password') {
                        connection.end(auth.password);
                        server.close();
                    } else {
                    }
                }
                if (data.length > 0) {
                    parts.push(data);
                }

            });
        });

        var listenPath = getListenPath();

        server.listen(listenPath, function(ready) {
            resolve({path:listenPath,close:function() { server.close(); }});
        });
        server.on('close', function() {
            // console.log("Closing response server");
            fs.removeSync(listenPath);
        });
        server.on('error',function(err) {
            console.log("ResponseServer unexpectedError:",err.toString());
            server.close();
            reject(err);
        })
    });
}

var ResponseSSHServer = function(auth) {
    return new Promise(function(resolve, reject) {
        var server = net.createServer(function(connection) {
            connection.setEncoding('utf8');
            var parts = [];
            connection.on('data', function(data) {
                var m = data.indexOf("\n");
                if (m !== -1) {
                    parts.push(data.substring(0, m));
                    data = data.substring(m);
                    var line = parts.join("");
                    parts = [];
                    if (line==='The') {
                        // TODO: document these exchanges!
                        connection.end('yes');
                        // server.close();
                    } else if (line === 'Enter') {
                        connection.end(auth.passphrase);
                        // server.close();
                    } else {
                    }
                }
                if (data.length > 0) {
                    parts.push(data);
                }

            });
        });

        var listenPath = getListenPath();

        server.listen(listenPath, function(ready) {
            resolve({path:listenPath,close:function() { server.close(); }});
        });
        server.on('close', function() {
            // console.log("Closing response server");
            fs.removeSync(listenPath);
        });
        server.on('error',function(err) {
            console.log("ResponseServer unexpectedError:",err.toString());
            server.close();
            reject(err);
        })
    });
}


module.exports = {
    ResponseServer: ResponseServer,
    ResponseSSHServer: ResponseSSHServer
}
