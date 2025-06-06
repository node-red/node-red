const path = require('path')
const fs = require('fs/promises')
const semver = require('semver')
const cronosjs = require('cronosjs')

const METRICS_DIR = path.join(__dirname, 'metrics')
const INITIAL_PING_DELAY = 1000 * 60 * 30 // 30 minutes from startup

/** @type {import("got").Got | undefined} */
let got

let runtime

let scheduleTask

async function gather () {
    let metricFiles = await fs.readdir(METRICS_DIR)
    metricFiles = metricFiles.filter(name => /^\d+-.*\.js$/.test(name))
    metricFiles.sort()

    const metrics = {}

    for (let i = 0, l = metricFiles.length; i < l; i++) {
        const metricModule = require(path.join(METRICS_DIR, metricFiles[i]))
        let result = metricModule(runtime)
        if (!!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') {
            result = await result
        }
        const keys = Object.keys(result)
        keys.forEach(key => {
            const keyParts = key.split('.')
            let p = metrics
            keyParts.forEach((part, index) => {
                if (index < keyParts.length - 1) {
                    if (!p[part]) {
                        p[part] = {}
                    }
                    p = p[part]
                } else {
                    p[part] = result[key]
                }
            })
        })
    }
    return metrics
}

async function report () {
    if (!isTelemetryEnabled()) {
        return
    }
    // If enabled, gather metrics
    const metrics = await gather()

    // Post metrics to endpoint - handle any error silently

    if (!got) {
        got = (await import('got')).got
    }

    runtime.log.debug('Sending telemetry')
    const response = await got.post('https://telemetry.nodered.org/ping', {
        json: metrics,
        responseType: 'json',
        headers: {
            'User-Agent': `Node-RED/${runtime.settings.version}`
        }
    }).json().catch(err => {
        // swallow errors
        runtime.log.debug('Failed to send telemetry: ' + err.toString())
    })
    // Example response:      
    // { 'node-red': { latest: '4.0.9', next: '4.1.0-beta.1.9' } }
    runtime.log.debug(`Telemetry response: ${JSON.stringify(response)}`)
    // Get response from endpoint
    if (response?.['node-red']) {
        const currentVersion = metrics.env['node-red']
        if (semver.valid(currentVersion)) {
            const latest = response['node-red'].latest
            const next = response['node-red'].next
            let updatePayload
            if (semver.lt(currentVersion, latest)) {
                // Case one: current < latest
                runtime.log.info(`A new version of Node-RED is available: ${latest}`)
                updatePayload = { version: latest }
            } else if (semver.gt(currentVersion, latest) && semver.lt(currentVersion, next)) {
                // Case two: current > latest && current < next
                runtime.log.info(`A new beta version of Node-RED is available: ${next}`)
                updatePayload = { version: next }
            }

            if (updatePayload && isUpdateNotificationEnabled()) {
                runtime.events.emit("runtime-event",{id:"update-available", payload: updatePayload, retain: true});
            }
        }
    }
}

function isTelemetryEnabled () {
    // If NODE_RED_DISABLE_TELEMETRY was set, or --no-telemetry was specified,
    // the settings object will have been updated to disable telemetry explicitly

    // If there are no telemetry settings then the user has not had a chance
    // to opt out yet - so keep it disabled until they do

    let telemetrySettings
    try {
        telemetrySettings = runtime.settings.get('telemetry')
    } catch (err) {
        // Settings not available
    }
    let runtimeTelemetryEnabled
    try {
        runtimeTelemetryEnabled = runtime.settings.get('telemetryEnabled')
    } catch (err) {
        // Settings not available
    }

    if (telemetrySettings === undefined && runtimeTelemetryEnabled === undefined) {
        // No telemetry settings - so keep it disabled
        return undefined
    }

    // User has made a choice; defer to that
    if (runtimeTelemetryEnabled !== undefined) {
        return runtimeTelemetryEnabled
    }

    // If there are telemetry settings, use what it says
    if (telemetrySettings && telemetrySettings.enabled !== undefined) {
        return telemetrySettings.enabled
    }

    // At this point, we have no sign the user has consented to telemetry, so
    // keep disabled - but return undefined as a false-like value to distinguish
    // it from the explicit disable above
    return undefined
}

function isUpdateNotificationEnabled () {
    const telemetrySettings = runtime.settings.get('telemetry') || {}
    return telemetrySettings.updateNotification !== false
}
/**
 * Start the telemetry schedule
 */
function startTelemetry () {
    if (scheduleTask) {
        // Already scheduled - nothing left to do
        return
    }

    const pingTime = new Date(Date.now() + INITIAL_PING_DELAY)
    const pingMinutes = pingTime.getMinutes()
    const pingHours = pingTime.getHours()
    const pingSchedule = `${pingMinutes} ${pingHours} * * *`

    runtime.log.debug(`Telemetry enabled. Schedule: ${pingSchedule}`)

    scheduleTask = cronosjs.scheduleTask(pingSchedule, () => {
        report()
    })
}

function stopTelemetry () {
    if (scheduleTask) {
        runtime.log.debug(`Telemetry disabled`)
        scheduleTask.stop()
        scheduleTask = null 
    }
}

module.exports = {
    init: (_runtime) => {
        runtime = _runtime

        if (isTelemetryEnabled()) {
            startTelemetry()
        }
    },
    /**
     * Enable telemetry via user opt-in in the editor
     */
    enable: () => {
        if (runtime.settings.available()) {
            runtime.settings.set('telemetryEnabled', true)
        }
        startTelemetry()
    },

    /**
     * Disable telemetry via user opt-in in the editor
     */
    disable: () => {
        if (runtime.settings.available()) {
            runtime.settings.set('telemetryEnabled', false)
        }
        stopTelemetry()
    },

    /**
     * Get telemetry enabled status
     * @returns {boolean} true if telemetry is enabled, false if disabled, undefined if not set
     */
    isEnabled: isTelemetryEnabled,

    stop: () => {
        if (scheduleTask) {
            scheduleTask.stop()
            scheduleTask = null 
        }
    }
}