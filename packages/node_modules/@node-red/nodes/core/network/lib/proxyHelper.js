/*
The MIT License

Copyright (C) 2016-2018 Rob Wu <rob@robwu.nl>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

/* 
This proxy helper is heavily based on the proxy helper from Rob Wu as detailed above.
It has been modified to work with the Node-RED runtime environment.
The license for the original code is reproduced above.
*/


/**
 * Parse a URL into its components.
 * @param {String} url The URL to parse
 * @returns {URL}
 */
const parseUrl = (url) => {
    let parsedUrl = {
        protocol: null,
        host: null,
        port: null,
        hostname: null,
        query: null,
        href: null
    }
    try {
        if (!url) { return parsedUrl }
        parsedUrl = new URL(url)
    } catch (error) {
        // dont throw error
    }
    return parsedUrl
}

const DEFAULT_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443,
    mqtt: 1880,
    mqtts: 8883
}

const modeOverride = getEnv('NR_PROXY_MODE', {})

/**
 * @typedef {Object} ProxyOptions
 * @property {'strict'|'legacy'} [mode] - Legacy mode is for non-strict previous proxy determination logic (for node-red <= v3.1 compatibility) (default 'strict')
 * @property {boolean} [favourUpperCase] - Favour UPPER_CASE *_PROXY env vars (default false)
 * @property {boolean} [lowerCaseOnly] - Prevent UPPER_CASE *_PROXY env vars being used. (default false)
 * @property {boolean} [excludeNpm] - Prevent npm_config_*_proxy env vars being used. (default false)
 * @property {object} [env] - The environment object to use (defaults to process.env)
 */

/**
 * Get the proxy URL for a given URL.
 * @param {string|URL} url - The URL, or the result from url.parse.
 * @param {ProxyOptions} [options] - The options object (optional)
 * @return {string} The URL of the proxy that should handle the request to the
 *  given URL. If no proxy is set, this will be an empty string.
 */
function getProxyForUrl(url, options) {
    url = url || ''
    const defaultOptions = {
        mode: 'strict',
        lowerCaseOnly: false,
        favourUpperCase: false,
        excludeNpm: false,
    }
    options = Object.assign({}, defaultOptions, options)

    if (modeOverride === 'legacy' || modeOverride === 'strict') {
        options.mode = modeOverride
    }

    if (options.mode === 'legacy') {
        return legacyGetProxyForUrl(url, options.env || process.env)
    }
   
    const parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {}
    let proto = parsedUrl.protocol
    let hostname = parsedUrl.host
    let port = parsedUrl.port
    if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
        return ''  // Don't proxy URLs without a valid scheme or host.
    }

    proto = proto.split(':', 1)[0]
    // Stripping ports in this way instead of using parsedUrl.hostname to make
    // sure that the brackets around IPv6 addresses are kept.
    hostname = hostname.replace(/:\d*$/, '')
    port = parseInt(port) || DEFAULT_PORTS[proto] || 0
    if (!shouldProxy(hostname, port, options)) {
        return ''  // Don't proxy URLs that match NO_PROXY.
    }

    let proxy =
        getEnv('npm_config_' + proto + '_proxy', options) ||
        getEnv(proto + '_proxy', options) ||
        getEnv('npm_config_proxy', options) ||
        getEnv('all_proxy', options)
    if (proxy && proxy.indexOf('://') === -1) {
        // Missing scheme in proxy, default to the requested URL's scheme.
        proxy = proto + '://' + proxy
    }
    return proxy
}

/**
 * Get the proxy URL for a given URL.
 * For node-red < v3.1 or compatibility mode
 * @param {string} url The URL to check for proxying
 * @param {object} [env] The environment object to use (default process.env)
 * @returns 
 */
function legacyGetProxyForUrl(url, env) {
    env = env || process.env
    let prox, noprox;
    if (env.http_proxy) { prox = env.http_proxy; }
    if (env.HTTP_PROXY) { prox = env.HTTP_PROXY; }
    if (env.no_proxy) { noprox = env.no_proxy.split(","); }
    if (env.NO_PROXY) { noprox = env.NO_PROXY.split(","); }

    let noproxy = false;
    if (noprox) {
        for (let i in noprox) {
            if (url.indexOf(noprox[i].trim()) !== -1) { noproxy=true; }
        }
    }
    if (prox && !noproxy) {
        return prox
    }
    return ""
}

/**
 * Determines whether a given URL should be proxied.
 *
 * @param {string} hostname - The host name of the URL.
 * @param {number} port - The effective port of the URL.
 * @returns {boolean} Whether the given URL should be proxied.
 * @private
 */
function shouldProxy(hostname, port, options) {
    const NO_PROXY =
        (getEnv('npm_config_no_proxy', options) || getEnv('no_proxy', options)).toLowerCase()
    if (!NO_PROXY) {
        return true  // Always proxy if NO_PROXY is not set.
    }
    if (NO_PROXY === '*') {
        return false  // Never proxy if wildcard is set.
    }

    return NO_PROXY.split(/[,\s]/).every(function (proxy) {
        if (!proxy) {
            return true  // Skip zero-length hosts.
        }
        const parsedProxy = proxy.match(/^(.+):(\d+)$/)
        let parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy
        const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0
        if (parsedProxyPort && parsedProxyPort !== port) {
            return true  // Skip if ports don't match.
        }

        if (!/^[.*]/.test(parsedProxyHostname)) {
            // No wildcards, so stop proxying if there is an exact match.
            return hostname !== parsedProxyHostname
        }

        if (parsedProxyHostname.charAt(0) === '*') {
            // Remove leading wildcard.
            parsedProxyHostname = parsedProxyHostname.slice(1)
        }
        // Stop proxying if the hostname ends with the no_proxy host.
        return !hostname.endsWith(parsedProxyHostname)
    })
}

/**
 * Get the value for an environment constiable.
 *
 * @param {string} key - The name of the environment constiable.
 * @param {ProxyOptions} options - The name of the environment constiable.
 * @return {string} The value of the environment constiable.
 * @private
 */
function getEnv(key, options) {
    const env = (options && options.env) || process.env
    if (options && options.excludeNpm === true) {
        if (key.startsWith('npm_config_')) {
            return ''
        }
    }
    if (options && options.lowerCaseOnly === true) {
        return env[key.toLowerCase()] || ''
    } else if (options && options.favourUpperCase === true) {
        return env[key.toUpperCase()] ||  env[key.toLowerCase()] || ''
    }
    return env[key.toLowerCase()] || env[key.toUpperCase()] || ''
}

module.exports = {
    getProxyForUrl,
    parseUrl
}
