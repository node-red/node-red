
var should = require("should");
var sinon = require("sinon");
var NR_TEST_UTILS = require("nr-test-utils");
var diagnostics = NR_TEST_UTILS.require("@node-red/runtime/lib/api/diagnostics")

var mockLog = () => ({
    log: sinon.stub(),
    debug: sinon.stub(),
    trace: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    metric: sinon.stub(),
    audit: sinon.stub(),
    _: function() { return "abc"}
})

describe("runtime-api/diagnostics", function() {

    describe("get", function() {
        before(function() {
            diagnostics.init({
                isStarted: () => true,
                nodes: {
                    getNodeList: () => [{module:"node-red", version:"9.9.9"},{module:"node-red-node-inject", version:"8.8.8"}]
                },
                settings: {
                    version: "7.7.7",
                    available: () => true,
                    //apiMaxLength: xxx, deliberately left blank. Should arrive in report as "UNSET"
                    debugMaxLength: 1111,
                    disableEditor: false,
                    flowFile: "flows.json",
                    mqttReconnectTime: 321,
                    serialReconnectTime: 432,
                    socketReconnectTime: 2222,
                    socketTimeout: 3333,
                    tcpMsgQueueSize: 4444,
                    inboundWebSocketTimeout: 5555,
                    runtimeState: {enabled: true, ui: false},
                    adminAuth: {},//should be sanitised to "SET"
                    httpAdminRoot: "/admin/root/",
                    httpAdminCors: {},//should be sanitised to "SET"
                    httpNodeAuth: {},//should be sanitised to "SET"
                    httpNodeRoot: "/node/root/",
                    httpNodeCors: {},//should be sanitised to "SET"
                    httpStatic: "/var/static/",//should be sanitised to "SET"
                    httpStaticRoot: "/static/root/",
                    httpStaticCors: {},//should be sanitised to "SET"
                    uiHost: "something.secret.com",//should be sanitised to "SET"
                    uiPort: 1337,//should be sanitised to "SET"
                    userDir: "/var/super/secret/",//should be sanitised to "SET",
                    nodesDir: "/var/super/secret/",//should be sanitised to "SET",
                    contextStorage: {
                        default    : { module: "memory" },
                        file: { module: "localfilesystem" },
                        secured: { module: "secure_store", user: "fred", pass: "super-duper-secret" },
                    },
                    editorTheme: {}
                },
                log: mockLog()
            });
        })
        it("returns basic user settings", function() {
            return diagnostics.get({scope:"fake_scope"}).then(result => {
                should(result).be.type("object");

                //result.xxxxx
                Object.keys(result)
                const reportPropCount = Object.keys(result).length;
                reportPropCount.should.eql(7);//ensure no more than 7 keys are present in the report (avoid leakage of extra info)
                result.should.have.property("report","diagnostics");
                result.should.have.property("scope","fake_scope");
                result.should.have.property("time").type("object");
                result.should.have.property("intl").type("object");
                result.should.have.property("nodejs").type("object");
                result.should.have.property("os").type("object");
                result.should.have.property("runtime").type("object");

                //result.runtime.xxxxx
                const runtimeCount = Object.keys(result.runtime).length;
                runtimeCount.should.eql(5);//ensure 5 keys are present in runtime 
                result.runtime.should.have.property('isStarted',true)
                result.runtime.should.have.property('flows')
                result.runtime.should.have.property('modules').type("object");
                result.runtime.should.have.property('settings').type("object");
                result.runtime.should.have.property('version','7.7.7');

                //result.runtime.modules.xxxxx
                const moduleCount = Object.keys(result.runtime.modules).length;
                moduleCount.should.eql(2);//ensure no more than the 2 modules specified are present
                result.runtime.modules.should.have.property('node-red','9.9.9');
                result.runtime.modules.should.have.property('node-red-node-inject','8.8.8');

                //result.runtime.settings.xxxxx
                const settingsCount = Object.keys(result.runtime.settings).length;
                settingsCount.should.eql(27);//ensure no more than the 21 settings listed below are present in the settings object
                result.runtime.settings.should.have.property('available',true);
                result.runtime.settings.should.have.property('apiMaxLength', "UNSET");//deliberately disabled to ensure UNSET is returned
                result.runtime.settings.should.have.property('debugMaxLength', 1111);
                result.runtime.settings.should.have.property('disableEditor', false);
                result.runtime.settings.should.have.property('editorTheme', {});
                result.runtime.settings.should.have.property('flowFile', "flows.json");
                result.runtime.settings.should.have.property('mqttReconnectTime', 321);
                result.runtime.settings.should.have.property('serialReconnectTime', 432);
                result.runtime.settings.should.have.property('socketReconnectTime', 2222);
                result.runtime.settings.should.have.property('socketTimeout', 3333);
                result.runtime.settings.should.have.property('tcpMsgQueueSize', 4444);
                result.runtime.settings.should.have.property('inboundWebSocketTimeout', 5555);
                result.runtime.settings.should.have.property('runtimeState', {enabled: true, ui: false});
                result.runtime.settings.should.have.property("adminAuth", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property("httpAdminCors", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property('httpAdminRoot', "/admin/root/");
                result.runtime.settings.should.have.property("httpNodeAuth", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property("httpNodeCors", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property('httpNodeRoot', "/node/root/");
                result.runtime.settings.should.have.property("httpStatic", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property('httpStaticRoot', "/static/root/");
                result.runtime.settings.should.have.property("httpStaticCors", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property("uiHost", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property("uiPort", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property("userDir", "SET"); //should be sanitised to "SET"
                result.runtime.settings.should.have.property('contextStorage').type("object");
                result.runtime.settings.should.have.property('nodesDir', "SET")

                //result.runtime.settings.contextStorage.xxxxx
                const contextCount = Object.keys(result.runtime.settings.contextStorage).length;
                contextCount.should.eql(3);//ensure no more than the 3 settings listed below are present in the contextStorage object
                result.runtime.settings.contextStorage.should.have.property('default', {module:"memory"});
                result.runtime.settings.contextStorage.should.have.property('file', {module:"localfilesystem"});
                result.runtime.settings.contextStorage.should.have.property('secured', {module:"secure_store"}); //only module should be present, other fields are dropped for security

            })
        })

    });


});
