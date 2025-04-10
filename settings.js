module.exports = {
    credentialSecret: process.env.NODE_RED_SECRET || "clave-super-secreta",
    uiPort: process.env.PORT || 1880,
    adminAuth: {
        type: "credentials",
        users: [{
            username: process.env.NODE_RED_USERNAME || "admin",
            password: process.env.NODE_RED_PASSWORD || "admin",
            permissions: "*"
        }]
    },
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    }
}
