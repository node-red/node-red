
const os = require('os');
const fs = require('fs');

let runtime;
let isContainerCached;
let isWSLCached;

const isInWsl = () => {
    if (isWSLCached === undefined) {
        isWSLCached = getIsInWSL();
    }
    return isWSLCached;
    function getIsInWSL() {
        if (process.platform !== 'linux') {
            return false;
        }
        try {
            if (os.release().toLowerCase().includes('microsoft')) {
                if (isInContainer()) {
                    return false;
                }
                return true;
            }
            return fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft') ? !isInContainer() : false;
        } catch (_) {
            return false;
        }
    }
};

const isInContainer = () => {
    if (isContainerCached === undefined) {
        isContainerCached = hasDockerEnv() || hasDockerCGroup();
    }
    return isContainerCached;
    function hasDockerEnv() {
        try {
            fs.statSync('/.dockerenv');
            return true;
        } catch {
            return false;
        }
    }
    function hasDockerCGroup() {
        try {
            const s = fs.readFileSync('/proc/self/cgroup', 'utf8');
            if (s.includes('docker')) {
                return "docker"
            } else if (s.includes('kubepod')) {
                return "kubepod"
            } else if (s.includes('lxc')) {
                return "lxc"
            }
        } catch {
            return false;
        }
    }
}

function buildDiagnosticReport(scope, callback) {
    const modules = {};
    const nl = runtime.nodes.getNodeList();
    for (let i = 0; i < nl.length; i++) {
        if (modules[nl[i].module]) {
            continue;
        }
        modules[nl[i].module] = nl[i].version
    }

    const now = new Date();
    const {locale, timeZone} = Intl.DateTimeFormat().resolvedOptions();
    const report = {
        report: "diagnostics",
        scope: scope,
        time: {
            utc: now.toUTCString(),
            local: now.toLocaleString(),
        },
        intl: {
            locale, timeZone
        },
        nodejs: {
            version: process.version,
            arch: process.arch,
            platform: process.platform,
            memoryUsage: process.memoryUsage(),
        },
        os: {
            containerised: isInContainer(),
            wsl: isInWsl(),
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            arch: os.arch(),
            loadavg: os.loadavg(),
            platform: os.platform(),
            release: os.release(),
            type: os.type(),
            uptime: os.uptime(),
            version: os.version(),
        },
        runtime: {
            version: runtime.settings.version,
            isStarted: runtime.isStarted(),
            flows: {
                state: runtime.flows && runtime.flows.state(),
                started: runtime.flows && runtime.flows.started,
            },
            modules: modules,
            settings: {
                available: runtime.settings.available(),
                apiMaxLength: runtime.settings.apiMaxLength || "UNSET",
                //coreNodesDir: runtime.settings.coreNodesDir,
                disableEditor: runtime.settings.disableEditor,
                contextStorage: listContextModules(),
                debugMaxLength: runtime.settings.debugMaxLength || "UNSET",
                editorTheme: runtime.settings.editorTheme || "UNSET",
                flowFile: runtime.settings.flowFile || "UNSET",
                mqttReconnectTime: runtime.settings.mqttReconnectTime || "UNSET",
                serialReconnectTime: runtime.settings.serialReconnectTime || "UNSET",
                socketReconnectTime: runtime.settings.socketReconnectTime || "UNSET",
                socketTimeout: runtime.settings.socketTimeout || "UNSET",
                tcpMsgQueueSize: runtime.settings.tcpMsgQueueSize || "UNSET",
                inboundWebSocketTimeout: runtime.settings.inboundWebSocketTimeout || "UNSET",
                runtimeState: runtime.settings.runtimeState || "UNSET",

                adminAuth: runtime.settings.adminAuth ? "SET" : "UNSET",

                httpAdminRoot: runtime.settings.httpAdminRoot || "UNSET",
                httpAdminCors: runtime.settings.httpAdminCors ? "SET" : "UNSET",
                httpNodeAuth: runtime.settings.httpNodeAuth ? "SET" : "UNSET",

                httpNodeRoot: runtime.settings.httpNodeRoot || "UNSET",
                httpNodeCors: runtime.settings.httpNodeCors ? "SET" : "UNSET",

                httpStatic: runtime.settings.httpStatic ? "SET" : "UNSET",
                httpStaticRoot: runtime.settings.httpStaticRoot || "UNSET",
                httpStaticCors: runtime.settings.httpStaticCors ? "SET" : "UNSET",

                uiHost: runtime.settings.uiHost ? "SET" : "UNSET",
                uiPort: runtime.settings.uiPort ? "SET" : "UNSET",
                userDir: runtime.settings.userDir ? "SET" : "UNSET",
                nodesDir: runtime.settings.nodesDir && runtime.settings.nodesDir.length ? "SET" : "UNSET",
            }
        }
    }

    // if (scope == "admin") {
    //     const moreSettings = {
    //         adminAuth_type: (runtime.settings.adminAuth && runtime.settings.adminAuth.type) ? runtime.settings.adminAuth.type : "UNSET",
    //         httpAdminCors: runtime.settings.httpAdminCors ? runtime.settings.httpAdminCors : "UNSET",
    //         httpNodeCors: runtime.settings.httpNodeCors ? runtime.settings.httpNodeCors : "UNSET",
    //         httpStaticCors: runtime.settings.httpStaticCors ? "SET" : "UNSET",
    //         settingsFile: runtime.settings.settingsFile ? runtime.settings.settingsFile : "UNSET",
    //         uiHost: runtime.settings.uiHost ? runtime.settings.uiHost : "UNSET",
    //         uiPort: runtime.settings.uiPort ? runtime.settings.uiPort : "UNSET",
    //         userDir: runtime.settings.userDir ? runtime.settings.userDir : "UNSET",
    //     }
    //     const moreNodejs = {
    //         execPath: process.execPath,
    //         pid: process.pid,
    //     }
    //     const moreOs = {
    //         cpus: os.cpus(),
    //         homedir: os.homedir(),
    //         hostname: os.hostname(),
    //         networkInterfaces: os.networkInterfaces(),
    //     }
    //     report.runtime.settings = Object.assign({}, report.runtime.settings, moreSettings);
    //     report.nodejs = Object.assign({}, report.nodejs, moreNodejs);
    //     report.os = Object.assign({}, report.os, moreOs);
    // }

    callback(report);

    /** gets a sanitised list containing only the module name */
    function listContextModules() {
        const keys = Object.keys(runtime.settings.contextStorage || {});
        const result = {};
        keys.forEach(e => {
            result[e] = {
                module: String(runtime.settings.contextStorage[e].module)
            }
        })
        return result;
    }
}


module.exports = {
    init: function (_runtime) {
        runtime = _runtime;
    },
    /**
    * Gets the node-red diagnostics report
    * @param {{scope: string}} opts - settings
    * @return {Promise} the diagnostics information
    * @memberof @node-red/diagnostics
    */
    get: async function (opts) {
        return new Promise(function (resolve, reject) {
            opts = opts || {}
            try {
                runtime.log.audit({ event: "diagnostics.get", scope: opts.scope }, opts.req);
                buildDiagnosticReport(opts.scope, (report) => resolve(report));
            } catch (error) {
                error.status = 500;
                reject(error);
            }
        })
    },
}
