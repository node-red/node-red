const should = require("should");

/*****

Issues with the current *_proxy implementation in Node-RED:
    * no_proxy should not be case-sensitive
        * i.e. if no_proxy contains "example.com", then "example.com" and "EXAMPLE.COM" should both be excluded
    * no_proxy with protocols that have a default port are not considered
        * i.e. if no_proxy contains "example.com:443", then "https://example.com" should be excluded
        * i.e. if no_proxy contains "example.com:80", then "http://example.com" should be excluded
        * i.e. if no_proxy contains "example.com:1880", then "mqtt://example.com" should be excluded
    * Does not consider NPM proxy configuration at all
        * i.e. if npm_config_proxy is set, then it should be used
        * i.e. if npm_config_https_proxy is set, then it should be used
        * i.e. if npm_config_http_proxy is set, then it should be used
        * i.e. if npm_config_no_proxy is set, then it should be used
    * Doesn't consider https_proxy or HTTPS_PROXY
        * i.e. if https_proxy is set, then it should be used
        * i.e. if HTTPS_PROXY is set, then it should be used
        * i.e. incorrectly uses HTTP_PROXY 'http://http-proxy' when the url is 'https://example'
    * Incorrectly prioritises HTTP_PROXY over http_proxy. HTTP_PROXY is not always supported or recommended
        * i.e. if HTTP_PROXY and http_proxy are both set, then http_proxy should be used
        * Use lowercase form. HTTP_PROXY is not always supported or recommended
    * doesn't consider all_proxy or ALL_PROXY
        * i.e. if all_proxy is set, then it should be used
        * i.e. if ALL_PROXY is set, then it should be used
        * 
        * 
This implementation is based on the following sources:
    * https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/ (GitLab)
    * https://www.npmjs.com/package/proxy-from-env (MIT License)

This implementation proposal follows the following rules:
    * Support the following PROTOCOL_proxys
        * i.e. http_proxy, https_proxy, mqtt_proxy, ws_proxy, wss_proxy, mqtt_proxy, mqtts_proxy
    * Support all_proxy
        * i.e. if all_proxy is set, then all URLs will be proxied
    * Use comma-separated hostname[:port] values for no_proxy.
        * no_proxy should contain a comma-separated list of domain extensions proxy should not be used for
        * Each value may include optional whitespace.
        * port is optional and is inferred if the protocol has a default port (supports http, https, mqtt, ws, wss, mqtt, mqtts)
        * Use * to match all hosts
    * Support .example (host suffix)
    * Support sub.example (host sub domain)
    * Upper case forms of *_PROXY are supported but not recommended
    * Lower case forms of *_proxy will take precedence over upper case forms
    * Does not perform DNS lookups or use regular expressions
    * Does not perform validation on the *_proxy urls
    * Does not support CIDR block matching
    * Support IPv6 matching
******/

/* eslint max-statements:0 */
'use strict';

const assert = require('assert');

const { getProxyForUrl } = require("nr-test-utils").require('@node-red/nodes/core/network/lib/proxyHelper')

/**
 * Defines a test case that checks whether getProxyForUrl(input) === expected.
 * @param {object} env - The environment variables to use for the test
 * @param {*} expected - The expected result
 * @param {*} input - The input to test
 * @param {import('../../../../../packages/node_modules/@node-red/nodes/core/network/lib/proxyHelper').ProxyOptions} [options] - The options to use for getProxyForUrl
 * @param {string} [testName] - The name of the test (auto computed if not provided)
 */
function testProxyUrl(env, expected, input, options, testName) {
    assert(typeof env === 'object' && env !== null);
    // Copy object to make sure that the in param does not get modified between
    // the call of this function and the use of it below.
    env = JSON.parse(JSON.stringify(env));

    const title = testName || 'Proxy for URL ' + JSON.stringify(input) + ' === ' + JSON.stringify(expected);

    // Save call stack for later use.
    let stack = {};
    Error.captureStackTrace(stack, testProxyUrl);
    // Only use the last stack frame because that shows where this function is
    // called, and that is sufficient for our purpose. No need to flood the logs
    // with an uninteresting stack trace.
    stack = stack.stack.split('\n', 2)[1];

    it(title, function () {
        let actual;
        // runWithEnv(env, function () {
        //     actual = getProxyForUrl(input, options);
        // });
        options = options || {};
        options.env = options.env || env || process.env;
        actual = getProxyForUrl(input, options);
        if (expected === actual) {
            return;  // Good!
        }
        try {
            assert.strictEqual(expected, actual); // Create a formatted error message.
            // Should not happen because previously we determined expected !== actual.
            throw new Error('assert.strictEqual passed. This is impossible!');
        } catch (e) {
            // Use the original stack trace, so we can see a helpful line number.
            e.stack = e.message + stack;
            throw e;
        }
    });
}

describe('Proxy Helper', function () {
    describe('No proxy variables', function () {
        const env = {};
        testProxyUrl(env, '', 'http://example.com');
        testProxyUrl(env, '', 'https://example.com');
        testProxyUrl(env, '', 'ftp://example.com');
        testProxyUrl(env, '', 'ws://example.com');
        testProxyUrl(env, '', 'wss://example.com');
        testProxyUrl(env, '', 'mqtt://example.com');
        testProxyUrl(env, '', 'mqtts://example.com');
    });

    describe('Invalid URLs', function () {
        const env = {};
        env.ALL_PROXY = 'http://unexpected.proxy';
        testProxyUrl(env, '', 'bogus');
        testProxyUrl(env, '', '//example.com');
        testProxyUrl(env, '', '://example.com');
        testProxyUrl(env, '', '://');
        testProxyUrl(env, '', '/path');
        testProxyUrl(env, '', '');
        testProxyUrl(env, '', 'ws:');
        testProxyUrl(env, '', 'wss:');
        testProxyUrl(env, '', 'mqtt:');
        testProxyUrl(env, '', 'mqtts:');
        testProxyUrl(env, '', 'http:');
        testProxyUrl(env, '', 'http:/');
        testProxyUrl(env, '', 'http://');
        testProxyUrl(env, '', 'prototype://');
        testProxyUrl(env, '', 'hasOwnProperty://');
        testProxyUrl(env, '', '__proto__://');
        testProxyUrl(env, '', undefined);
        testProxyUrl(env, '', null);
        testProxyUrl(env, '', {});
        testProxyUrl(env, '', { host: 'x', protocol: 1 });
        testProxyUrl(env, '', { host: 1, protocol: 'x' });
    });
    describe('Proxy options', function () {
        describe('lowerCaseOnly:true should prevent *_PROXY being returned', function () {
            const env = {};
            env.HTTP_PROXY = 'http://upper-case-proxy';
            env.HTTPS_PROXY = 'https://upper-case-proxy';
            env.http_proxy = '';
            env.https_proxy = '';
            env.no_proxy = '';
            testProxyUrl(env, '', 'http://example', { lowerCaseOnly: true }, 'returns empty string because `lowerCaseOnly` is set and http_proxy is not set');
            testProxyUrl(env, '', 'https://example', { lowerCaseOnly: true }, 'returns empty string because `lowerCaseOnly` is set and https_proxy is not set');
            testProxyUrl(env, 'http://upper-case-proxy', 'http://example', null, 'returns HTTP_PROXY because lowerCaseOnly is false by default');
            testProxyUrl(env, 'https://upper-case-proxy', 'https://example', null, 'returns HTTPS_PROXY because lowerCaseOnly is false by default');
        });

        describe('favourUpperCase:false should cause *_PROXY to being used before *_proxy', function () {
            const env = {};
            env.HTTP_PROXY = 'http://upper-case-proxy';
            env.http_proxy = 'http://lower-case-proxy';
            testProxyUrl(env, 'http://upper-case-proxy', 'http://example', { favourUpperCase: true }, 'returns HTTP_PROXY by due to `favourUpperCase`');
            testProxyUrl(env, 'http://lower-case-proxy', 'http://example', null, 'returns http_proxy by as it takes precedence by default');
        });

        describe('includeNpm:false should not return npm_config_*_proxy env vars', function () {
            const env = {};
            env.npm_config_http_proxy = 'http://npm-proxy';
            env.npm_config_https_proxy = 'https://npm-proxy';
            testProxyUrl(env, '', 'http://example', { excludeNpm: true });
            testProxyUrl(env, 'http://npm-proxy', 'http://example'); // lowercase takes precedence by default
            testProxyUrl(env, 'https://npm-proxy', 'https://example');
        });

        describe('When legacy mode is true, should process urls proxy in node-red <= v3.1 compatibility mode', function () {
            const env = {};
            // legacy mode does not consider npm_config_*_proxy
            env.npm_config_http_proxy = 'http://npm-proxy';
            testProxyUrl(env, '', 'http://example/1', { mode: 'legacy' });
            testProxyUrl(env, 'http://npm-proxy', 'http://example/1');

            // legacy mode does not consider all_proxy
            env.all_proxy = 'http://all-proxy';
            testProxyUrl(env, '', 'http://example/2', { mode: 'legacy' }); // returns empty string in "legacy" mode

            // legacy mode does not consider *_proxy
            env.npm_config_http_proxy = null;
            env.http_proxy = 'http://http-proxy';
            env.no_proxy = 'example';
            testProxyUrl(env, '', 'http://example/3a', { mode: 'legacy' });

            // legacy mode does not consider protocol_proxy for https urls and uses http_proxy instead
            env.https_proxy = 'https://https-proxy';
            env.no_proxy = '';
            testProxyUrl(env, 'http://http-proxy', 'https://example/4', { mode: 'legacy' }); // returns http_proxy instead of https_proxy

            // legacy mode favours UPPER_CASE over lower_case
            env.HTTP_PROXY = 'http://http-proxy-upper';
            env.http_proxy = 'http://http-proxy';
            env.no_proxy = '';
            testProxyUrl(env, 'http://http-proxy-upper', 'http://example/5', { mode: 'legacy' }, 'returns HTTP_PROXY "http://http-proxy-upper" because mode is "legacy"');

            // no_proxy with protocols that have a default port are not considered
            // * i.e. if no_proxy contains "example.com:443", then "https://example.com" should be excluded
            // * i.e. if no_proxy contains "example.com:80", then "http://example.com" should be excluded
            // * i.e. if no_proxy contains "example.com:1880", then "mqtt://example.com" should be excluded
            env.HTTP_PROXY = 'http://http-proxy';
            env.http_proxy = 'http://http-proxy';
            env.no_proxy = 'example.com:80';
            testProxyUrl(env, 'http://http-proxy', 'http://example.com', { mode: 'legacy' }, 'incorrectly returns http_proxy for "http://example.com" when mode is "legacy"');
            testProxyUrl(env, '', 'http://example.com:80', { mode: 'legacy' }); // works as expected
            testProxyUrl(env, '', 'http://example.com:8080', { mode: 'legacy' }, 'incorrectly returns http_proxy for "http://example.com:8080" when mode is "legacy"');

            // legacy mode does not correctly process no_proxy with protocols that have a default port
            env.HTTP_PROXY = 'http://http-proxy';
            env.http_proxy = 'http://http-proxy';
            env.no_proxy = 'example.com:80';
            testProxyUrl(env, '', 'http://example.com:80', { mode: 'legacy' }); // works as expected
            testProxyUrl(env, 'http://http-proxy', 'http://example.com', { mode: 'legacy' }, 'incorrectly returns http_proxy for "http://example.com" when no_proxy is "example.com:80" and mode is "legacy"');

            env.HTTP_PROXY = 'http://http-proxy';
            env.NO_PROXY = '[::1],[::2]:80,10.0.0.1,10.0.0.2:80';
            testProxyUrl(env, '', 'http://[::1]/', { mode: 'legacy' });
            testProxyUrl(env, '', 'http://[::1]:80/', { mode: 'legacy' });
            testProxyUrl(env, '', 'http://[::1]:1337/', { mode: 'legacy' });

            testProxyUrl(env, 'http://http-proxy', 'http://[::2]/', { mode: 'legacy' }); // http://[::2]/ is essentially the same as http://[::2]:80, this should NOT be proxied
            testProxyUrl(env, '', 'http://[::2]:80/', { mode: 'legacy' });
            testProxyUrl(env, 'http://http-proxy', 'http://[::2]:1337/', { mode: 'legacy' });

            testProxyUrl(env, '', 'http://10.0.0.1/', { mode: 'legacy' });
            testProxyUrl(env, '', 'http://10.0.0.1:80/', { mode: 'legacy' });
            testProxyUrl(env, '', 'http://10.0.0.1:1337/', { mode: 'legacy' });

            testProxyUrl(env, 'http://http-proxy', 'http://10.0.0.2/', { mode: 'legacy' }); // http://10.0.0.2 is essentially the same as http://10.0.0.2:80, this should NOT be proxied
            testProxyUrl(env, '', 'http://10.0.0.2:80/', { mode: 'legacy' });
            testProxyUrl(env, 'http://http-proxy', 'http://10.0.0.2:1337/', { mode: 'legacy' });
        });
    });

    describe('http_proxy and HTTP_PROXY', function () {
        const env = {};
        env.HTTP_PROXY = 'http://http-proxy';

        testProxyUrl(env, '', 'https://example');
        testProxyUrl(env, 'http://http-proxy', 'http://example');
        testProxyUrl(env, 'http://http-proxy', new URL('http://example'));

        // eslint-disable-next-line camelcase
        env.http_proxy = 'http://priority';
        testProxyUrl(env, 'http://priority', 'http://example');
    });

    describe('http_proxy with nonsense value', function () {
        const env = {};
        // Crazy values should be passed as-is. It is the responsibility of the
        // one who launches the application that the value makes sense.
        env.HTTP_PROXY = 'Crazy \n!() { ::// }';
        testProxyUrl(env, 'Crazy \n!() { ::// }', 'http://wow');

        // The implementation assumes that the HTTP_PROXY environment variable is
        // somewhat reasonable, and if the scheme is missing, it is added.
        // Garbage in, garbage out!
        env.HTTP_PROXY = 'crazy without colon slash slash';
        testProxyUrl(env, 'http://crazy without colon slash slash', 'http://wow');
    });

    describe('https_proxy and HTTPS_PROXY', function () {
        const env = {};
        // Assert that there is no fall back to http_proxy
        env.HTTP_PROXY = 'http://unexpected.proxy';
        testProxyUrl(env, '', 'https://example', null, 'https URL is not proxied when only HTTP_PROXY is set');

        env.HTTPS_PROXY = 'http://https-proxy';
        testProxyUrl(env, 'http://https-proxy', 'https://example');

        // eslint-disable-next-line camelcase
        env.https_proxy = 'http://priority';
        testProxyUrl(env, 'http://priority', 'https://example', null, 'https_proxy takes precedence over HTTPS_PROXY');
    });

    describe('ftp_proxy', function () {
        const env = {};
        // Something else than http_proxy / https, as a sanity check.
        env.FTP_PROXY = 'http://ftp-proxy';

        testProxyUrl(env, 'http://ftp-proxy', 'ftp://example');
        testProxyUrl(env, '', 'ftps://example');
    });

    describe('ws_proxy', function () {
        const env = {};
        // Something else than http_proxy / https, as a sanity check.
        env.ws_proxy = 'ws://ws-proxy';

        testProxyUrl(env, 'ws://ws-proxy', 'ws://example1');
        testProxyUrl(env, '', 'wss://example2');
    });

    describe('mqtt_proxy', function () {
        const env = {};
        // Something else than http_proxy / https, as a sanity check.
        env.mqtt_proxy = 'tcp://mqtt-proxy';
        env.no_proxy = 'direct';

        testProxyUrl(env, '', 'mqtt://direct');
        testProxyUrl(env, 'tcp://mqtt-proxy', 'mqtt://example1');
        testProxyUrl(env, '', 'mqtts://example2');
    });

    describe('all_proxy', function () {
        const env = {};
        env.ALL_PROXY = 'http://catch-all';
        testProxyUrl(env, 'http://catch-all', 'http://example');

        // eslint-disable-next-line camelcase
        env.all_proxy = 'http://priority';
        testProxyUrl(env, 'http://priority', 'https://example');
    });

    describe('all_proxy without scheme', function () {
        const env = {};
        env.ALL_PROXY = 'noscheme';
        testProxyUrl(env, 'http://noscheme', 'http://example');
        testProxyUrl(env, 'https://noscheme', 'https://example');

        // The module does not impose restrictions on the scheme.
        testProxyUrl(env, 'bogus-scheme://noscheme', 'bogus-scheme://example');

        // But the URL should still be valid.
        testProxyUrl(env, '', 'bogus');
    });

    describe('no_proxy empty', function () {
        const env = {};
        env.HTTPS_PROXY = 'http://i-am-proxy';

        // NO_PROXY set but empty.
        env.NO_PROXY = '';
        testProxyUrl(env, 'http://i-am-proxy', 'https://example1');

        // No entries in NO_PROXY (comma).
        env.NO_PROXY = ',';
        testProxyUrl(env, 'http://i-am-proxy', 'https://example2');

        // No entries in NO_PROXY (whitespace).
        env.NO_PROXY = ' ';
        testProxyUrl(env, 'http://i-am-proxy', 'https://example3');

        // No entries in NO_PROXY (multiple whitespace / commas).
        env.NO_PROXY = ',\t,,,\n,  ,\r';
        testProxyUrl(env, 'http://i-am-proxy', 'https://example4');
    });

    describe('no_proxy=example (single host)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = 'example';
        testProxyUrl(env, '', 'http://example');
        testProxyUrl(env, '', 'http://example:80');
        testProxyUrl(env, '', 'http://example:0');
        testProxyUrl(env, '', 'http://example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://sub.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, 'http://i-am-proxy', 'http://a.b.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://host/example');
    });

    describe('no_proxy=sub.example (subdomain)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = 'sub.example';
        testProxyUrl(env, '', 'http://sub.example');
        testProxyUrl(env, '', 'http://sub.example:80');
        testProxyUrl(env, '', 'http://sub.example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:80');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://bus.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://bus.example:80');
        testProxyUrl(env, 'http://i-am-proxy', 'http://bus.example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://a.b.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, 'http://i-am-proxy', 'http://host/example');
    });

    describe('no_proxy=example:80 (host + port)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = 'example:80';
        testProxyUrl(env, '', 'http://example');
        testProxyUrl(env, '', 'http://example:80');
        testProxyUrl(env, '', 'http://example:0');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://sub.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, 'http://i-am-proxy', 'http://a.b.example');
    });

    describe('no_proxy=.example (host suffix)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '.example';
        testProxyUrl(env, 'http://i-am-proxy', 'http://example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:80');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:1337');
        testProxyUrl(env, '', 'http://sub.example');
        testProxyUrl(env, '', 'http://sub.example:80');
        testProxyUrl(env, '', 'http://sub.example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, '', 'http://a.b.example');
    });

    describe('no_proxy=.example (host suffix + port)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '.example:8080';
        testProxyUrl(env, 'http://i-am-proxy', 'http://example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:80');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:8080');
        testProxyUrl(env, 'http://i-am-proxy', 'http://sub.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://sub.example:80');
        testProxyUrl(env, '', 'http://sub.example:8080');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, 'http://i-am-proxy', 'http://a.b.example');
        testProxyUrl(env, '', 'http://a.b.example:8080');
    });

    describe('no_proxy=*', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';
        env.HTTPS_PROXY = 'https://i-am-proxy';
        env.NO_PROXY = '*';
        testProxyUrl(env, '', 'http://example.com');
        testProxyUrl(env, '', 'http://example:80');
        testProxyUrl(env, '', 'http://example:1337');
        testProxyUrl(env, '', 'https://example.com');
        testProxyUrl(env, '', 'https://example:443');
    });

    describe('no_proxy=*.example (host suffix with *.)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '*.example';
        testProxyUrl(env, 'http://i-am-proxy', 'http://example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:80');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example:1337');
        testProxyUrl(env, '', 'http://sub.example');
        testProxyUrl(env, '', 'http://sub.example:80');
        testProxyUrl(env, '', 'http://sub.example:1337');
        testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, '', 'http://a.b.example');
    });

    describe('no_proxy=*example (substring suffix)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '*example';
        const t = getProxyForUrl('http://example', { env });
        testProxyUrl(env, '', 'http://example');
        testProxyUrl(env, '', 'http://example:80');
        testProxyUrl(env, '', 'http://example:1337');
        testProxyUrl(env, '', 'http://sub.example');
        testProxyUrl(env, '', 'http://sub.example:80');
        testProxyUrl(env, '', 'http://sub.example:1337');
        testProxyUrl(env, '', 'http://prefexample');
        testProxyUrl(env, '', 'http://a.b.example');
        testProxyUrl(env, 'http://i-am-proxy', 'http://example.no');
        testProxyUrl(env, 'http://i-am-proxy', 'http://host/example');
    });

    describe('no_proxy=.*example (arbitrary wildcards are NOT supported)',
        function () {
            const env = {};
            env.HTTP_PROXY = 'http://i-am-proxy';

            env.NO_PROXY = '.*example';
            testProxyUrl(env, 'http://i-am-proxy', 'http://example');
            testProxyUrl(env, 'http://i-am-proxy', 'http://sub.example');
            testProxyUrl(env, 'http://i-am-proxy', 'http://prefexample');
            testProxyUrl(env, 'http://i-am-proxy', 'http://x.prefexample');
            testProxyUrl(env, 'http://i-am-proxy', 'http://a.b.example');
        });

    describe('no_proxy=[::1],[::2]:80,10.0.0.1,10.0.0.2:80 (IP addresses)',
        function () {
            const env = {};
            env.HTTP_PROXY = 'http://i-am-proxy';

            env.NO_PROXY = '[::1],[::2]:80,10.0.0.1,10.0.0.2:80';
            testProxyUrl(env, '', 'http://[::1]/');
            testProxyUrl(env, '', 'http://[::1]:80/');
            testProxyUrl(env, '', 'http://[::1]:1337/');

            testProxyUrl(env, '', 'http://[::2]/');
            testProxyUrl(env, '', 'http://[::2]:80/');
            testProxyUrl(env, 'http://i-am-proxy', 'http://[::2]:1337/');

            testProxyUrl(env, '', 'http://10.0.0.1/');
            testProxyUrl(env, '', 'http://10.0.0.1:80/');
            testProxyUrl(env, '', 'http://10.0.0.1:1337/');

            testProxyUrl(env, '', 'http://10.0.0.2/');
            testProxyUrl(env, '', 'http://10.0.0.2:80/');
            testProxyUrl(env, 'http://i-am-proxy', 'http://10.0.0.2:1337/');

            testProxyUrl(env, 'http://i-am-proxy', 'http://10.0.0.3/');
            testProxyUrl(env, 'http://i-am-proxy', 'http://10.0.0.3:80/');
            testProxyUrl(env, 'http://i-am-proxy', 'http://10.0.0.3:1337/');
        });

    describe('no_proxy=127.0.0.1/32 (CIDR is NOT supported)', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '127.0.0.1/32';
        testProxyUrl(env, 'http://i-am-proxy', 'http://127.0.0.1');
        testProxyUrl(env, 'http://i-am-proxy', 'http://127.0.0.1/32');
    });

    describe('no_proxy=127.0.0.1 does NOT match localhost', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';

        env.NO_PROXY = '127.0.0.1';
        testProxyUrl(env, '', 'http://127.0.0.1');
        // We're not performing DNS queries, so this shouldn't match.
        testProxyUrl(env, 'http://i-am-proxy', 'http://localhost');
    });

    describe('no_proxy with protocols that have a default port', function () {
        const env = {};
        env.MQTT_PROXY = 'http://mqtt';
        env.MQTTS_PROXY = 'https://m_q_t_t_s_proxy';
        env.WS_PROXY = 'http://ws';
        env.WSS_PROXY = 'http://wss';
        env.HTTP_PROXY = 'http://http';
        env.HTTPS_PROXY = 'http://https';
        env.GOPHER_PROXY = 'http://gopher';
        env.FTP_PROXY = 'http://ftp';
        env.ALL_PROXY = 'http://all';

        env.NO_PROXY = 'xxx:21,xxx:70,xxx:80,xxx:443,xxx:1880,xxx:8880';

        testProxyUrl(env, '', 'http://xxx');
        testProxyUrl(env, '', 'http://xxx:80');
        testProxyUrl(env, 'http://http', 'http://xxx:1337');

        testProxyUrl(env, '', 'ws://xxx');
        testProxyUrl(env, '', 'ws://xxx:80');
        testProxyUrl(env, 'http://ws', 'ws://xxx:1337');

        testProxyUrl(env, '', 'https://xxx');
        testProxyUrl(env, '', 'https://xxx:443');
        testProxyUrl(env, 'http://https', 'https://xxx:1337');

        testProxyUrl(env, '', 'wss://xxx');
        testProxyUrl(env, '', 'wss://xxx:443');
        testProxyUrl(env, 'http://wss', 'wss://xxx:1337');

        testProxyUrl(env, '', 'gopher://xxx');
        testProxyUrl(env, '', 'gopher://xxx:70');
        testProxyUrl(env, 'http://gopher', 'gopher://xxx:1337');

        testProxyUrl(env, '', 'ftp://xxx');
        testProxyUrl(env, '', 'ftp://xxx:21');
        testProxyUrl(env, 'http://ftp', 'ftp://xxx:1337');

        testProxyUrl(env, '', 'mqtt://xxx');
        testProxyUrl(env, '', 'mqtt://xxx:1880');
        testProxyUrl(env, 'http://mqtt', 'mqtt://xxx:1337');

        testProxyUrl(env, 'http://mqtt', 'mqtt://yyy');
        testProxyUrl(env, 'http://mqtt', 'mqtt://yyy:1880');

        testProxyUrl(env, 'http://all', 'unknown://xxx');
        testProxyUrl(env, 'http://all', 'unknown://xxx:1234');
    });

    describe('no_proxy should not be case-sensitive', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';
        env.NO_PROXY = 'XXX,YYY,ZzZ';

        testProxyUrl(env, 'http://i-am-proxy', 'http://abc');
        testProxyUrl(env, '', 'http://xxx');
        testProxyUrl(env, '', 'http://XXX');
        testProxyUrl(env, '', 'http://yyy');
        testProxyUrl(env, '', 'http://YYY');
        testProxyUrl(env, '', 'http://ZzZ');
        testProxyUrl(env, '', 'http://zZz');
    });

    describe('no_proxy should accept space separated entries', function () {
        const env = {};
        env.HTTP_PROXY = 'http://i-am-proxy';
        env.NO_PROXY = 'X X X,Y Y Y,Z z Z';

        testProxyUrl(env, '', 'http://x x x');
        testProxyUrl(env, '', 'http://X X X');
        testProxyUrl(env, '', 'http://y y y');
        testProxyUrl(env, '', 'http://Y Y Y');
        testProxyUrl(env, '', 'http://Z z Z');
        testProxyUrl(env, '', 'http://z Z z');
    });

    describe('NPM proxy configuration', function () {
        describe('npm_config_http_proxy should work', function () {
            const env = {};
            // eslint-disable-next-line camelcase
            env.npm_config_http_proxy = 'http://http-proxy';

            testProxyUrl(env, '', 'https://example');
            testProxyUrl(env, 'http://http-proxy', 'http://example');

            // eslint-disable-next-line camelcase
            env.npm_config_http_proxy = 'http://priority';
            testProxyUrl(env, 'http://priority', 'http://example');
        });
        // eslint-disable-next-line max-len
        describe('npm_config_http_proxy should take precedence over HTTP_PROXY and npm_config_proxy', function () {
            const env = {};
            // eslint-disable-next-line camelcase
            env.npm_config_http_proxy = 'http://http-proxy';
            // eslint-disable-next-line camelcase
            env.npm_config_proxy = 'http://unexpected-proxy';
            env.HTTP_PROXY = 'http://unexpected-proxy';

            testProxyUrl(env, 'http://http-proxy', 'http://example');
        });
        describe('npm_config_https_proxy should work', function () {
            const env = {};
            // eslint-disable-next-line camelcase
            env.npm_config_http_proxy = 'http://unexpected.proxy';
            testProxyUrl(env, '', 'https://example');

            // eslint-disable-next-line camelcase
            env.npm_config_https_proxy = 'http://https-proxy';
            testProxyUrl(env, 'http://https-proxy', 'https://example');

            // eslint-disable-next-line camelcase
            env.npm_config_https_proxy = 'http://priority';
            testProxyUrl(env, 'http://priority', 'https://example');
        });
        // eslint-disable-next-line max-len
        describe('npm_config_https_proxy should take precedence over HTTPS_PROXY and npm_config_proxy', function () {
            const env = {};
            // eslint-disable-next-line camelcase
            env.npm_config_https_proxy = 'http://https-proxy';
            // eslint-disable-next-line camelcase
            env.npm_config_proxy = 'http://unexpected-proxy';
            env.HTTPS_PROXY = 'http://unexpected-proxy';

            testProxyUrl(env, 'http://https-proxy', 'https://example');
        });
        describe('npm_config_proxy should work', function () {
            const env = {};
            // eslint-disable-next-line camelcase
            env.npm_config_proxy = 'http://http-proxy';
            testProxyUrl(env, 'http://http-proxy', 'http://example');
            testProxyUrl(env, 'http://http-proxy', 'https://example');

            // eslint-disable-next-line camelcase
            env.npm_config_proxy = 'http://priority';
            testProxyUrl(env, 'http://priority', 'http://example');
            testProxyUrl(env, 'http://priority', 'https://example');
        });
        // eslint-disable-next-line max-len
        describe('HTTP_PROXY and HTTPS_PROXY should take precedence over npm_config_proxy', function () {
            const env = {};
            env.HTTP_PROXY = 'http://http-proxy';
            env.HTTPS_PROXY = 'http://https-proxy';
            // eslint-disable-next-line camelcase
            env.npm_config_proxy = 'http://unexpected-proxy';
            testProxyUrl(env, 'http://http-proxy', 'http://example');
            testProxyUrl(env, 'http://https-proxy', 'https://example');
        });
        describe('npm_config_no_proxy should work', function () {
            const env = {};
            env.HTTP_PROXY = 'http://i-am-proxy';
            // eslint-disable-next-line camelcase
            env.npm_config_no_proxy = 'example';

            testProxyUrl(env, '', 'http://example');
            testProxyUrl(env, 'http://i-am-proxy', 'http://otherwebsite');
        });
        // eslint-disable-next-line max-len
        describe('npm_config_no_proxy should take precedence over NO_PROXY', function () {
            const env = {};
            env.HTTP_PROXY = 'http://i-am-proxy';
            env.NO_PROXY = 'otherwebsite';
            // eslint-disable-next-line camelcase
            env.npm_config_no_proxy = 'example';

            testProxyUrl(env, '', 'http://example');
            testProxyUrl(env, 'http://i-am-proxy', 'http://otherwebsite');
        });
    });
});