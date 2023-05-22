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

const express = require("express");

const { log, i18n } = require("@node-red/util");

module.exports = {
    errorHandler: function(err,req,res,next) {
        //TODO: why this when rejectHandler also?!

        if (err.message === "request entity too large") {
            log.error(err);
        } else {
            log.error(err.stack);
        }
        log.audit({event: "api.error",error:err.code||"unexpected_error",message:err.toString()},req);
        res.status(400).json({error:"unexpected_error", message:err.toString()});
    },

    determineLangFromHeaders: function(acceptedLanguages){
        var lang = i18n.defaultLang;
        acceptedLanguages = acceptedLanguages || [];
        if (acceptedLanguages.length >= 1) {
            lang = acceptedLanguages[0];
        }
        return lang;
    },
    rejectHandler: function(req,res,err) {
        //TODO: why this when errorHandler also?!
        log.audit({event: "api.error",error:err.code||"unexpected_error",message:err.message||err.toString()},req);
        if (!err.code) {
            // by definition, an unexpected_error to log
            log.error(err);
        }
        var response = {
            code: err.code||"unexpected_error",
            message: err.message||err.toString()
        };
        // Handle auth failures on a specific remote
        // TODO: don't hardcode this here - allow users of rejectHandler to identify extra props to send
        if (err.remote) {
            response.remote = err.remote;
        }
        res.status(err.status||400).json(response);
    },
    getRequestLogObject: function(req) {
        return {
            user: req.user,
            path: req.path,
            ip: (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress) || undefined
        }
    },
    createExpressApp: function(settings) {
        const app = express();
    
        const defaultServerSettings = {
            "x-powered-by": false
        }
        const serverSettings = Object.assign({},defaultServerSettings,settings.httpServerOptions||{});
        for (let eOption in serverSettings) {
            app.set(eOption, serverSettings[eOption]);
        }
        return app
    }
}
