var apiUtils = require("../util");

var runtimeAPI;

module.exports = {
    init: function(_runtimeAPI) {
        runtimeAPI = _runtimeAPI;
    },
    getAll: function(req,res) {
        var opts = {
            user: req.user,
            req: apiUtils.getRequestLogObject(req)
        }
        if (req.get("accept") == "application/json") {
            runtimeAPI.plugins.getPluginList(opts).then(function(list) {
                res.json(list);
            })
        } else {
            opts.lang = apiUtils.determineLangFromHeaders(req.acceptsLanguages());
            if (/[^0-9a-z=\-\*]/i.test(opts.lang)) {
                opts.lang = "en-US";
            }
            runtimeAPI.plugins.getPluginConfigs(opts).then(function(configs) {
                res.send(configs);
            })
        }
    },
    getCatalogs: function(req,res) {
        var opts = {
            user: req.user,
            lang: req.query.lng,
            req: apiUtils.getRequestLogObject(req)
        }
        if (/[^0-9a-z=\-\*]/i.test(opts.lang)) {
            opts.lang = "en-US";
        }
        runtimeAPI.plugins.getPluginCatalogs(opts).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            console.log(err.stack);
            apiUtils.rejectHandler(req,res,err);
        })
    },
    getConfig: function(req, res) {

        let opts = {
            user: req.user,
            module: req.params[0],
            req: apiUtils.getRequestLogObject(req)
        }

        if (req.get("accept") === "application/json") {
            runtimeAPI.nodes.getNodeInfo(opts.module).then(function(result) {
                res.send(result);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        } else {
            opts.lang = apiUtils.determineLangFromHeaders(req.acceptsLanguages());
            if (/[^0-9a-z=\-\*]/i.test(opts.lang)) {
                opts.lang = "en-US";
            }
            runtimeAPI.plugins.getPluginConfig(opts).then(function(result) {
                return res.send(result);
            }).catch(function(err) {
                apiUtils.rejectHandler(req,res,err);
            })
        }
    }
};
