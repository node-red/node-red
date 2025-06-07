module.exports = (runtime) => {
    return {
        instanceId: runtime.settings.get('instanceId')
    }
}
