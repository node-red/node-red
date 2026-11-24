const should = require("should");
const EventEmitter = require("events");
const NR_TEST_UTILS = require("nr-test-utils");

const MULTIPLAYER_PATH = NR_TEST_UTILS.resolve("@node-red/runtime/lib/multiplayer");

describe('multiplayer', function() {
    let multiplayer
    let events
    let emitted
    let idCounter

    beforeEach(function() {
        // Reload the module to reset its internal session state
        delete require.cache[require.resolve(MULTIPLAYER_PATH)]
        multiplayer = require(MULTIPLAYER_PATH)
        events = new EventEmitter()
        emitted = []
        idCounter = 0
        events.on('comms', msg => emitted.push(msg))
        multiplayer.init({
            events,
            log: { debug: () => {} },
            util: { generateId: () => 'id' + (idCounter++) }
        })
    })

    function connect(commsSession, session, user) {
        events.emit('comms:message:multiplayer/connect', { session: commsSession, user, data: { session } })
    }
    function closeConnection(commsSession) {
        events.emit('comms:connection-removed', { session: commsSession })
    }
    function lastInit(commsSession) {
        return emitted.filter(m => m.topic === 'multiplayer/init' && m.session === commsSession).pop()
    }

    it('lists an active session to a new connection', function() {
        connect('c1', 'sessionA', { username: 'alice' })
        connect('c2', 'sessionB', { username: 'bob' })
        const init = lastInit('c2')
        init.data.sessions.should.have.length(2)
        init.data.sessions.map(s => s.user.username).should.eql(['alice', 'bob'])
    })

    it('marks a session inactive when its connection is removed', function() {
        connect('c1', 'sessionA', { username: 'alice' })
        closeConnection('c1')
        connect('c2', 'sessionB', { username: 'bob' })
        lastInit('c2').data.sessions.should.have.length(1)
    })

    it('does not leave phantom sessions when one connection sends multiple session ids', function() {
        connect('c1', 'ghostA1', { username: 'alice' })
        const firstPublicId = lastInit('c1').data.session
        connect('c1', 'ghostA2', { username: 'alice' })
        connect('c1', 'ghostA3', { username: 'alice' })

        // Previous sessions are announced as removed
        const removed = emitted.filter(m => m.topic === 'multiplayer/connection-removed')
        removed.should.have.length(2)
        removed[0].data.session.should.equal(firstPublicId)

        closeConnection('c1')
        connect('c2', 'sessionB', { username: 'bob' })
        const sessions = lastInit('c2').data.sessions
        sessions.should.have.length(1)
        sessions[0].user.username.should.equal('bob')
    })

    it('removes the previous session when a connection switches to another existing session', function() {
        connect('c1', 'sessionA', { username: 'alice' })
        closeConnection('c1')
        connect('c2', 'sessionB', { username: 'alice' })
        // c2 switches to reconnect sessionA
        connect('c2', 'sessionA', { username: 'alice' })
        connect('c3', 'sessionC', { username: 'bob' })
        lastInit('c3').data.sessions.map(s => s.user.username).should.eql(['alice', 'bob'])
    })

    it('keeps the session when a connection reconnects with the same session id', function() {
        connect('c1', 'sessionA', { username: 'alice' })
        connect('c1', 'sessionA', { username: 'alice' })
        emitted.filter(m => m.topic === 'multiplayer/connection-removed').should.have.length(0)
        connect('c2', 'sessionB', { username: 'bob' })
        lastInit('c2').data.sessions.should.have.length(2)
    })

    it('ignores an invalid session id without removing the existing session', function() {
        connect('c1', 'sessionA', { username: 'alice' })
        connect('c1', 'bad-id!', { username: 'alice' })
        emitted.filter(m => m.topic === 'multiplayer/connection-removed').should.have.length(0)
        connect('c2', 'sessionB', { username: 'bob' })
        lastInit('c2').data.sessions.should.have.length(2)
    })

    it('does not modify a shared anonymous user object', function() {
        const anonymousUser = { anonymous: true, permissions: '*' }
        connect('c1', 'sessionA', anonymousUser)
        connect('c2', 'sessionB', anonymousUser)
        should.not.exist(anonymousUser.username)
        const sessions = lastInit('c2').data.sessions
        sessions.should.have.length(2)
        sessions[0].user.should.not.equal(sessions[1].user)
        sessions[0].user.username.should.match(/^Anon \d+$/)
        sessions[1].user.username.should.match(/^Anon \d+$/)
    })
})
