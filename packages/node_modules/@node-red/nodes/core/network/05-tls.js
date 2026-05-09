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

var fs = require('fs');
module.exports = function(RED) {
    "use strict";

    function TLSConfig(n) {
        RED.nodes.createNode(this,n);
        this.valid = true;
        this.verifyservercert = n.verifyservercert;
        var certPath, keyPath, caPath, p12Path;
        var certEnv, keyEnv, caEnv;
        if (n.cert) { certPath = n.cert.trim(); }
        if (n.key) { keyPath = n.key.trim(); }
        if (n.ca) { caPath = n.ca.trim(); }
        if (n.p12) { p12Path = n.p12.trim(); }
        if (n.certEnv) { certEnv = n.certEnv }
        if (n.keyEnv) { keyEnv = n.keyEnv }
        if (n.caEnv) { caEnv = n.caEnv }
        this.certType = n.certType || "files";
        this.servername = (n.servername||"").trim();
        this.alpnprotocol = (n.alpnprotocol||"").trim();

        if (this.certType === "pfx" && p12Path && p12Path.length > 0) {
            try {
                this.pfx = fs.readFileSync(p12Path);
            }
            catch(err) {
                this.valid = false;
                this.error(err.toString());
                return;
            }
        }
        else if (this.certType === "env") {
            if (certEnv) {
                this.certEnv = Buffer.from(RED.util.evaluateNodeProperty(certEnv, 'env', this))
            }
            if (keyEnv) {
                this.keyEnv = Buffer.from(RED.util.evaluateNodeProperty(keyEnv, 'env', this))
            }
            if (caEnv) {
                this.caEnv = Buffer.from(RED.util.evaluateNodeProperty(caEnv, 'env', this))
            }
        }
        else if ((certPath && certPath.length > 0) || (keyPath && keyPath.length > 0) || (caPath && caPath.length > 0)) {
            if ( (certPath && certPath.length > 0) !== (keyPath && keyPath.length > 0)) {
                this.valid = false;
                this.error(RED._("tls.error.missing-file"));
                return;
            }
            try {
                if (certPath) {
                    this.cert = fs.readFileSync(certPath);
                }
                if (keyPath) {
                    this.key = fs.readFileSync(keyPath);
                }
                if (caPath) {
                    this.ca = fs.readFileSync(caPath);
                }
            }
            catch(err) {
                this.valid = false;
                this.error(err.toString());
                return;
            }
        }
        else {
            if (this.credentials) {
                var certData = this.credentials.certdata || "";
                var keyData = this.credentials.keydata || "";
                var caData = this.credentials.cadata || "";
                var p12Data = this.credentials.p12data || "";

                if ((certData.length > 0) !== (keyData.length > 0) && p12Data.length === 0) {
                    this.valid = false;
                    this.error(RED._("tls.error.missing-file"));
                    return;
                }

                if (certData) {
                    this.cert = certData;
                }
                if (keyData) {
                    this.key = keyData;
                }
                if (caData) {
                    this.ca = caData;
                }
                if (p12Data) {
                    this.pfx = Buffer.from(p12Data, 'base64');
                }
            }
        }
    }
    RED.nodes.registerType("tls-config", TLSConfig, {
        credentials: {
            certdata: {type:"text"},
            keydata: {type:"text"},
            cadata: {type:"text"},
            p12data: {type:"text"},
            passphrase: {type:"password"}
        },
        settings: {
            tlsConfigDisableLocalFiles: {
                value: false,
                exportable: true
            }
        }
    });

    TLSConfig.prototype.addTLSOptions = function(opts) {
        if (this.valid) {
            if (this.certType === "files") {
                if (this.key) {
                    opts.key = this.key;
                }
                if (this.cert) {
                    opts.cert = this.cert;
                }
                if (this.ca) {
                    opts.ca = this.ca;
                }
            }
            else if (this.certType === "env") {
                if (this.keyEnv) {
                    opts.key = this.keyEnv
                }
                if (this.certEnv) {
                    opts.cert= this.certEnv
                }
                if (this.caEnv) {
                    opts.ca = this.caEnv
                }
            }
            else {
                if (this.pfx) {
                    opts.pfx = this.pfx;
                }
            }
            if (this.credentials && this.credentials.passphrase) {
                opts.passphrase = this.credentials.passphrase;
            }
        }
        if (this.servername) {
            opts.servername = this.servername;
        }
        if (this.alpnprotocol) {
            opts.ALPNProtocols = [this.alpnprotocol];
        }
        opts.rejectUnauthorized = this.verifyservercert;
        return opts;
    }

}
