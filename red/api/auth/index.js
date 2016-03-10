/**
 * Copyright 2015 IBM Corp.
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

var passport = require("passport");
var oauth2orize = require("oauth2orize");

var strategies = require("./strategies");
var Tokens = require("./tokens");
var Users = require("./users");
var permissions = require("./permissions");

var theme = require("../theme");

var settings = null;
var log = null


passport.use(strategies.bearerStrategy.BearerStrategy);
passport.use(strategies.clientPasswordStrategy.ClientPasswordStrategy);
passport.use(strategies.anonymousStrategy);

var server = oauth2orize.createServer();

server.exchange(oauth2orize.exchange.password(strategies.passwordTokenExchange));

function init(runtime) {
    settings = runtime.settings;
    log = runtime.log;
    if (settings.adminAuth) {
        Users.init(settings.adminAuth);
        Tokens.init(settings.adminAuth,runtime.storage);
        strategies.init(runtime);
    }
}

function needsPermission(permission) {
    return function(req,res,next) {
        if (settings && settings.adminAuth) {
            return passport.authenticate(['bearer','anon'],{ session: false })(req,res,function() {
                if (!req.user) {
                    return next();
                }
                if (permissions.hasPermission(req.authInfo.scope,permission)) {
                    return next();
                }
                log.audit({event: "permission.fail"},req);
                return res.status(401).end();
            });
        } else {
            next();
        }
    }
}

function ensureClientSecret(req,res,next) {
    if (!req.body.client_secret) {
        req.body.client_secret = 'not_available';
    }
    next();
}
function authenticateClient(req,res,next) {
    return passport.authenticate(['oauth2-client-password'], {session: false})(req,res,next);
}
function getToken(req,res,next) {
    return server.token()(req,res,next);
}

function login(req,res) {
    var response = {};
    if (settings.adminAuth) {
        response = {
            "type":"credentials",
            "prompts":[{id:"username",type:"text",label:"Username"},{id:"password",type:"password",label:"Password"}]
        }
        if (theme.context().login && theme.context().login.image) {
            response.image = theme.context().login.image;
        }
    }
    res.json(response);
}

function revoke(req,res) {
    var token = req.body.token;
    // TODO: audit log
    Tokens.revoke(token).then(function() {
        log.audit({event: "auth.login.revoke"},req);
        res.status(200).end();
    });
}

module.exports = {
    init: init,
    needsPermission: needsPermission,
    ensureClientSecret: ensureClientSecret,
    authenticateClient: authenticateClient,
    getToken: getToken,
    errorHandler: function(err,req,res,next) {
        //TODO: audit log statment
        //console.log(err.stack);
        //log.log({level:"audit",type:"auth",msg:err.toString()});
        return server.errorHandler()(err,req,res,next);
    },
    login: login,
    revoke: revoke
}
