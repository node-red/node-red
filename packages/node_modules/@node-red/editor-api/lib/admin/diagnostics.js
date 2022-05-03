let runtimeAPI;
let settings;
const apiUtil = require("../util");
module.exports = {
    init: function(_settings, _runtimeAPI) {
        settings = _settings;
        runtimeAPI = _runtimeAPI;
    },
    getReport: function(req, res) {
        const diagnosticsOpts = settings.diagnostics || {};
        const opts = {
            user: req.user,
            scope: diagnosticsOpts.level || "basic"
        }
        if(diagnosticsOpts.enabled === false || diagnosticsOpts.enabled === "false") {
            apiUtil.rejectHandler(req, res, {message: "diagnostics are disabled", status: 403, code: "diagnostics.disabled" })
        } else {
            runtimeAPI.diagnostics.get(opts)
            .then(function(result) { res.json(result); })
            .catch(err => apiUtil.rejectHandler(req, res, err))
        }
    }
}
