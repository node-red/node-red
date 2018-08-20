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
var path = require("path");
var os = require("os");
var should = require("should");
var sinon = require("sinon");
var child_process = require("child_process");
var fs = require("fs-extra");

var NR_TEST_UTILS = require("nr-test-utils");

var authWriter = NR_TEST_UTILS.resolve("@node-red/runtime/lib/storage/localfilesystem/projects/git/authWriter");

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


describe("localfilesystem/projects/git/authWriter", function() {
    it("connects to port and sends passphrase", function(done) {
        var receivedData = "";
        var server = net.createServer(function(connection) {
            connection.setEncoding('utf8');
            connection.on('data', function(data) {
                receivedData += data;
                var m = data.indexOf("\n");
                if (m !== -1) {
                    connection.end();
                }
            });
        });

        var listenPath = getListenPath();

        server.listen(listenPath, function(ready) {
            child_process.exec('"'+process.execPath+'" "'+authWriter+'" "'+listenPath+'" TEST_PHRASE_FOO',{cwd:__dirname}, (error,stdout,stderr) => {
                server.close();
                try {
                    should.not.exist(error);
                    receivedData.should.eql("TEST_PHRASE_FOO\n");
                    done();
                } catch(err) {
                    done(err);
                }
            });
        });
        server.on('close', function() {
            // console.log("Closing response server");
            fs.removeSync(listenPath);
        });
        server.on('error',function(err) {
            console.log("ResponseServer unexpectedError:",err.toString());
            server.close();
            done(err);
        });


    })
});
