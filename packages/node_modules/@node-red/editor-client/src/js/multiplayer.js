RED.multiplayer = (function () {

    // activeSessionId - used to identify sessions across websocket reconnects
    let activeSessionId

    let headerWidget
    // Map of session id to { session:'', user:{}, location:{}}
    let sessions = {}
    // Map of username to { user:{}, sessions:[] }
    let users = {}

    function addUserSession (session) {
        if (sessions[session.session]) {
            // This is an existing connection that has been authenticated
            const existingSession = sessions[session.session]
            if (existingSession.user.username !== session.user.username) {
                removeUserHeaderButton(users[existingSession.user.username])
            }
        }
        sessions[session.session] = session
        const user = users[session.user.username] = users[session.user.username] || {
            user: session.user,
            sessions: []
        }
        if (session.user.profileColor === undefined) {
            session.user.profileColor = (1 + Math.floor(Math.random() * 5))
        }
        session.location = session.location || {}
        user.sessions.push(session)

        if (session.session === activeSessionId) {
            // This is the current user session - do not add a extra button for them
        } else {
            if (user.sessions.length === 1) {
                if (user.button) {
                    clearTimeout(user.inactiveTimeout)
                    clearTimeout(user.removeTimeout)
                    user.button.removeClass('inactive')
                } else {
                    addUserHeaderButton(user)
                }
            }
            sessions[session.session].location = session.location
            updateUserLocation(session.session)
        }
    }

    function removeUserSession (sessionId, isDisconnected) {
        removeUserLocation(sessionId)
        const session = sessions[sessionId]
        delete sessions[sessionId]
        const user = users[session.user.username]
        const i = user.sessions.indexOf(session)
        user.sessions.splice(i, 1)
        if (isDisconnected) {
            removeUserHeaderButton(user)
        } else {
            if (user.sessions.length === 0) {
                // Give the user 5s to reconnect before marking inactive
                user.inactiveTimeout = setTimeout(() => {
                    user.button.addClass('inactive')
                    // Give the user further 20 seconds to reconnect before removing them
                    // from the user toolbar entirely
                    user.removeTimeout = setTimeout(() => {
                        removeUserHeaderButton(user)
                    }, 20000)
                }, 5000)
            }
        }
    }

    function addUserHeaderButton (user) {
        user.button = $('<li class="red-ui-multiplayer-user"><button type="button" class="red-ui-multiplayer-user-icon"></button></li>')
            .attr('data-username', user.user.username)
            .prependTo("#red-ui-multiplayer-user-list");
        var button = user.button.find("button")
        RED.popover.tooltip(button, user.user.username)
        button.on('click', function () {
            const location = user.sessions[0].location
            revealUser(location)
        })

        const userProfile = RED.user.generateUserIcon(user.user)
        userProfile.appendTo(button)
    }

    function removeUserHeaderButton (user) {
        user.button.remove()
        delete user.button
    }

    function getLocation () {
        const location = {
            workspace: RED.workspaces.active()
        }
        const editStack = RED.editor.getEditStack()
        for (let i = editStack.length - 1; i >= 0; i--) {
            if (editStack[i].id) {
                location.node = editStack[i].id
                break
            }
        }
        if (isInWorkspace) {
            const chart = $('#red-ui-workspace-chart')
            const chartOffset = chart.offset()
            const scaleFactor = RED.view.scale()
            location.cursor = {
                x: (lastPosition[0] - chartOffset.left + chart.scrollLeft()) / scaleFactor,
                y: (lastPosition[1] - chartOffset.top + chart.scrollTop()) / scaleFactor
            }
        }
        return location
    }

    let publishLocationTimeout
    let lastPosition = [0,0]
    let isInWorkspace = false

    function publishLocation () {
        if (!publishLocationTimeout) {
            publishLocationTimeout = setTimeout(() => {
                const location = getLocation()
                if (location.workspace !== 0) {
                    log('send', 'multiplayer/location', location)
                    RED.comms.send('multiplayer/location', location)
                }
                publishLocationTimeout = null
            }, 100)
        }
    }


    function revealUser(location, skipWorkspace) {
        if (location.node) {
            // Need to check if this is a known node, so we can fall back to revealing
            // the workspace instead
            const node = RED.nodes.node(location.node)
            if (node) {
                RED.view.reveal(location.node)
            } else if (!skipWorkspace && location.workspace) {
                RED.view.reveal(location.workspace)
            }
        } else if (!skipWorkspace && location.workspace) {
            RED.view.reveal(location.workspace)
        }
    }

    const workspaceTrays = {}
    function getWorkspaceTray(workspaceId) {
        // console.log('get tray for',workspaceId)
        if (!workspaceTrays[workspaceId]) {
            const tray = $('<div class="red-ui-multiplayer-users-tray"></div>')
            const users = []
            const userIcons = {}

            const userCountIcon = $(`<div class="red-ui-multiplayer-user-location"><span class="red-ui-user-profile red-ui-multiplayer-user-count"><span></span></span></div>`)
            const userCountSpan = userCountIcon.find('span span')
            userCountIcon.hide()
            userCountSpan.text('')
            userCountIcon.appendTo(tray)
            const userCountTooltip = RED.popover.tooltip(userCountIcon, function () {
                    const content = $('<div>')
                    users.forEach(sessionId => {
                        $('<div>').append($('<a href="#">').text(sessions[sessionId].user.username).on('click', function (evt) {
                            evt.preventDefault()
                            revealUser(sessions[sessionId].location, true)
                            userCountTooltip.close()
                        })).appendTo(content)
                    })
                    return content
                },
                null,
                true
            )

            const updateUserCount = function () {
                const maxShown = 2
                const children = tray.children()
                children.each(function (index, element) {
                    const i = users.length - index
                    if (i > maxShown) {
                        $(this).hide()
                    } else if (i >= 0) {
                        $(this).show()
                    }
                })
                if (users.length < maxShown + 1) { 
                    userCountIcon.hide()
                } else {
                    userCountSpan.text('+'+(users.length - maxShown))
                    userCountIcon.show()
                }
            }
            workspaceTrays[workspaceId] = {
                attached: false,
                tray,
                users,
                userIcons,
                addUser: function (sessionId) {
                    if (users.indexOf(sessionId) === -1) {
                        // console.log(`addUser ws:${workspaceId} session:${sessionId}`)
                        users.push(sessionId)
                        const userLocationId = `red-ui-multiplayer-user-location-${sessionId}`
                        const userLocationIcon = $(`<div class="red-ui-multiplayer-user-location" id="${userLocationId}"></div>`)
                        RED.user.generateUserIcon(sessions[sessionId].user).appendTo(userLocationIcon)
                        userLocationIcon.prependTo(tray)
                        RED.popover.tooltip(userLocationIcon, sessions[sessionId].user.username)
                        userIcons[sessionId] = userLocationIcon
                        updateUserCount()
                    }
                },
                removeUser: function (sessionId) {
                    // console.log(`removeUser ws:${workspaceId} session:${sessionId}`)
                    const userLocationId = `red-ui-multiplayer-user-location-${sessionId}`
                    const index = users.indexOf(sessionId)
                    if (index > -1) {
                        users.splice(index, 1)
                        userIcons[sessionId].remove()
                        delete userIcons[sessionId]
                    }
                    updateUserCount()
                },
                updateUserCount
            }
        }
        const trayDef = workspaceTrays[workspaceId]
        if (!trayDef.attached) {
            const workspaceTab = $(`#red-ui-tab-${workspaceId}`)
            if (workspaceTab.length > 0) {
                trayDef.attached = true
                trayDef.tray.appendTo(workspaceTab)
                trayDef.users.forEach(sessionId => {
                    trayDef.userIcons[sessionId].on('click', function (evt) {
                        revealUser(sessions[sessionId].location, true)
                    })
                })
            }
        }
        return workspaceTrays[workspaceId]
    }
    function attachWorkspaceTrays () {
        let viewTouched = false
        for (let sessionId of Object.keys(sessions)) {
            const location = sessions[sessionId].location
            if (location) {
                if (location.workspace) {
                    getWorkspaceTray(location.workspace).updateUserCount()
                }
                if (location.node) {
                    addUserToNode(sessionId, location.node)
                    viewTouched = true
                }
            }
        }
        if (viewTouched) {
            RED.view.redraw()
        }
    }

    function addUserToNode(sessionId, nodeId) {
        const node = RED.nodes.node(nodeId)
        if (node) {
            if (!node._multiplayer) {
                node._multiplayer = {
                    users: [sessionId]
                }
                node._multiplayer_refresh = true
            } else {
                if (node._multiplayer.users.indexOf(sessionId) === -1) {
                    node._multiplayer.users.push(sessionId)
                    node._multiplayer_refresh = true
                }
            }
        }
    }
    function removeUserFromNode(sessionId, nodeId) {
        const node = RED.nodes.node(nodeId)
        if (node && node._multiplayer) {
            const i = node._multiplayer.users.indexOf(sessionId)
            if (i > -1) {
                node._multiplayer.users.splice(i, 1)
            }
            if (node._multiplayer.users.length === 0) {
                delete node._multiplayer
            } else {
                node._multiplayer_refresh = true
            }
        }

    }

    function removeUserLocation (sessionId) {
        updateUserLocation(sessionId, {})
        removeUserCursor(sessionId)
    }
    function removeUserCursor (sessionId) {
        // return
        if (sessions[sessionId]?.cursor) {
            sessions[sessionId].cursor.parentNode.removeChild(sessions[sessionId].cursor)
            delete sessions[sessionId].cursor
        }
    }

    function updateUserLocation (sessionId, location) {
        let viewTouched = false
        const oldLocation = sessions[sessionId].location
        if (location) {
            if (oldLocation.workspace !== location.workspace) {
                // console.log('removing', sessionId, oldLocation.workspace)
                workspaceTrays[oldLocation.workspace]?.removeUser(sessionId)
            }
            if (oldLocation.node !== location.node) {
                removeUserFromNode(sessionId, oldLocation.node)
                viewTouched = true
            }
            sessions[sessionId].location = location
        } else {
            location = sessions[sessionId].location
        }
        // console.log(`updateUserLocation sessionId:${sessionId} oldWS:${oldLocation?.workspace} newWS:${location.workspace}`)
        if (location.workspace) {
            getWorkspaceTray(location.workspace).addUser(sessionId)
            if (location.cursor && location.workspace === RED.workspaces.active()) {
                if (!sessions[sessionId].cursor) {
                    const user = sessions[sessionId].user
                    const cursorIcon = document.createElementNS("http://www.w3.org/2000/svg","g");
                    cursorIcon.setAttribute("class", "red-ui-multiplayer-annotation")
                    cursorIcon.appendChild(createAnnotationUser(user, true))
                    $(cursorIcon).css({
                        transform: `translate( ${location.cursor.x}px, ${location.cursor.y}px)`,
                        transition: 'transform 0.1s linear'
                    })
                    $("#red-ui-workspace-chart svg").append(cursorIcon)
                    sessions[sessionId].cursor = cursorIcon
                } else {
                    const cursorIcon = sessions[sessionId].cursor
                    $(cursorIcon).css({
                        transform: `translate( ${location.cursor.x}px, ${location.cursor.y}px)`
                    })
    
                }
            } else if (sessions[sessionId].cursor) {
                removeUserCursor(sessionId)
            }
        }
        if (location.node) {
            addUserToNode(sessionId, location.node)
            viewTouched = true
        }
        if (viewTouched) {
            RED.view.redraw()
        }
    }

    // function refreshUserLocations () {
    //     for (const session of Object.keys(sessions)) {
    //         if (session !== activeSessionId) {
    //             updateUserLocation(session)
    //         }
    //     }
    // }


    function createAnnotationUser(user, pointer = false) {
        const radius = 20
        const halfRadius = radius/2
        const group = document.createElementNS("http://www.w3.org/2000/svg","g");
        const badge = document.createElementNS("http://www.w3.org/2000/svg","path");
        let shapePath
        if (!pointer) {
            shapePath = `M 0 ${halfRadius} a ${halfRadius} ${halfRadius} 0 1 1 ${radius} 0 a ${halfRadius} ${halfRadius} 0 1 1 -${radius} 0 z`
        } else {
            shapePath = `M 0 0 h ${halfRadius} a ${halfRadius} ${halfRadius} 0 1 1 -${halfRadius} ${halfRadius} z`
        }
        badge.setAttribute('d', shapePath)
        badge.setAttribute("class", "red-ui-multiplayer-annotation-background")
        group.appendChild(badge)
        if (user && user.profileColor !== undefined) {
            badge.setAttribute("class", "red-ui-multiplayer-annotation-background red-ui-user-profile-color-" + user.profileColor)
        }
        if (user && user.image) {
            const image = document.createElementNS("http://www.w3.org/2000/svg","image");
            image.setAttribute("width", radius)
            image.setAttribute("height", radius)
            image.setAttribute("href", user.image)
            image.setAttribute("clip-path", "circle("+Math.floor(radius/2)+")")
            group.appendChild(image)
        } else if (user && user.anonymous) {
            const anonIconHead = document.createElementNS("http://www.w3.org/2000/svg","circle");
            anonIconHead.setAttribute("cx", radius/2)
            anonIconHead.setAttribute("cy", radius/2 - 2)
            anonIconHead.setAttribute("r", 2.4)
            anonIconHead.setAttribute("class","red-ui-multiplayer-annotation-anon-label");
            group.appendChild(anonIconHead)
            const anonIconBody = document.createElementNS("http://www.w3.org/2000/svg","path");
            anonIconBody.setAttribute("class","red-ui-multiplayer-annotation-anon-label");
            // anonIconBody.setAttribute("d",`M ${radius/2 - 4} ${radius/2 + 1} h 8 v4 h -8 z`);
            anonIconBody.setAttribute("d",`M ${radius/2} ${radius/2 + 5} h -2.5 c -2 1 -2 -5 0.5 -4.5 c 2 1 2 1 4 0 c 2.5 -0.5  2.5 5.5  0 4.5  z`);
            group.appendChild(anonIconBody)
        } else {
            const label = document.createElementNS("http://www.w3.org/2000/svg","text");
            if (user.username || user.email) {
                label.setAttribute("class","red-ui-multiplayer-annotation-label");
                label.textContent = (user.username || user.email).substring(0,2)
            } else {
                label.setAttribute("class","red-ui-multiplayer-annotation-label red-ui-multiplayer-user-count")
                label.textContent = 'nr'
            }
            label.setAttribute("text-anchor", "middle")
            label.setAttribute("x",radius/2);
            label.setAttribute("y",radius/2 + 3);
            group.appendChild(label)
        }
        const border = document.createElementNS("http://www.w3.org/2000/svg","path");
        border.setAttribute('d', shapePath)
        border.setAttribute("class", "red-ui-multiplayer-annotation-border")
        group.appendChild(border)
        return group
    }

    return {
        init: function () {

            
            
            RED.view.annotations.register("red-ui-multiplayer",{
                type: 'badge',
                align: 'left',
                class: "red-ui-multiplayer-annotation",
                show: "_multiplayer",
                refresh: "_multiplayer_refresh",
                element: function(node) {
                    const containerGroup = document.createElementNS("http://www.w3.org/2000/svg","g");
                    containerGroup.setAttribute("transform","translate(0,-4)")
                    if (node._multiplayer) {
                        let y = 0
                        for (let i = Math.min(1, node._multiplayer.users.length - 1); i >= 0; i--) {
                            const user = sessions[node._multiplayer.users[i]].user
                            const group = createAnnotationUser(user)
                            group.setAttribute("transform","translate("+y+",0)")
                            y += 15
                            containerGroup.appendChild(group)
                        }
                        if (node._multiplayer.users.length > 2) {
                            const group = createAnnotationUser('+'+(node._multiplayer.users.length - 2))
                            group.setAttribute("transform","translate("+y+",0)")
                            y += 12
                            containerGroup.appendChild(group)
                        }

                    }
                    return containerGroup;
                },
                tooltip: node => { return node._multiplayer.users.map(u => sessions[u].user.username).join('\n') }
            });


            // activeSessionId = RED.settings.getLocal('multiplayer:sessionId')
            // if (!activeSessionId) {
                activeSessionId = RED.nodes.id()
            //     RED.settings.setLocal('multiplayer:sessionId', activeSessionId)
            //     log('Session ID (new)', activeSessionId)
            // } else {
                log('Session ID', activeSessionId)
            // }
            
            headerWidget = $('<li><ul id="red-ui-multiplayer-user-list"></ul></li>').prependTo('.red-ui-header-toolbar')

            RED.comms.on('connect', () => {
                const location = getLocation()
                const connectInfo = {
                    session: activeSessionId
                }
                if (location.workspace !== 0) {
                    connectInfo.location = location
                }
                RED.comms.send('multiplayer/connect', connectInfo)
            })
            RED.comms.subscribe('multiplayer/#', (topic, msg) => {
                log('recv', topic, msg)
                if (topic === 'multiplayer/init') {
                    // We have just reconnected, runtime has sent state to
                    // initialise the world
                    sessions = {}
                    users = {}
                    $('#red-ui-multiplayer-user-list').empty()

                    msg.sessions.forEach(session => {
                        addUserSession(session)
                    })
                } else if (topic === 'multiplayer/connection-added') {
                    addUserSession(msg)
                } else if (topic === 'multiplayer/connection-removed') {
                    removeUserSession(msg.session, msg.disconnected)
                } else if (topic === 'multiplayer/location') {
                    const session = msg.session
                    delete msg.session
                    updateUserLocation(session, msg)
                }
            })

            RED.events.on('workspace:change', (event) => {
                getWorkspaceTray(event.workspace)
                publishLocation()
            })
            RED.events.on('editor:open', () => {
                publishLocation()
            })
            RED.events.on('editor:close', () => {
                publishLocation()
            })
            RED.events.on('editor:change', () => {
                publishLocation()
            })
            RED.events.on('login', () => {
                publishLocation()
            })
            RED.events.on('flows:loaded', () => {
                attachWorkspaceTrays()
            })
            RED.events.on('workspace:close', (event) => {
                // A subflow tab has been closed. Need to mark its tray as detached
                if (workspaceTrays[event.workspace]) {
                    workspaceTrays[event.workspace].attached = false
                }
            })
            RED.events.on('logout', () => {
                const disconnectInfo = {
                    session: activeSessionId
                }
                RED.comms.send('multiplayer/disconnect', disconnectInfo)
                RED.settings.removeLocal('multiplayer:sessionId')
            })
            
            const chart = $('#red-ui-workspace-chart')
            chart.on('mousemove', function (evt) {
                lastPosition[0] = evt.clientX
                lastPosition[1] = evt.clientY
                publishLocation()
            })
            chart.on('scroll', function (evt) {
                publishLocation()
            })
            chart.on('mouseenter', function () {
                isInWorkspace = true
                publishLocation()
            })
            chart.on('mouseleave', function () {
                isInWorkspace = false
                publishLocation()
            })
        }
    }

    function log() {
        if (RED.multiplayer.DEBUG) {
            console.log('[multiplayer]', ...arguments)
        }
    }
})();
