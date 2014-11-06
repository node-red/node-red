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

var passport = require("passport");
var oauth2orize = require("oauth2orize");

var strategies = require("./strategies");

var settings = require("../../settings");

passport.use(strategies.bearerStrategy.BearerStrategy);
passport.use(strategies.clientPasswordStrategy.ClientPasswordStrategy);

var server = oauth2orize.createServer();

server.exchange(oauth2orize.exchange.password(strategies.passwordTokenExchange));

function authenticate(req,res,next) {
    if (settings.httpAdminAuth) {
        if (/^\/auth\/.*/.test(req.originalUrl)) {
            next();
        } else {
            return passport.authenticate('bearer', { session: false })(req,res,next);
        }
    } else {
        next();
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


module.exports = {
    authenticate: authenticate,
    ensureClientSecret: ensureClientSecret,
    authenticateClient: authenticateClient,
    getToken: getToken,
    errorHandler: server.errorHandler()
}
