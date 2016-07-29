#### 0.14.6: Maintenance Release

Fixes

 - Tell ace about Function node globals. Closes #927
 - Tidy up mqtt nodes - linting and done handling. Closes #935
 - Fix invalid html in TCP and HTML node edit templates
 - Add proper help text to link nodes
 - Handle importing old mqtt-broker configs that lack properties
 - Update ace to 1.2.4
 - Allow config nodes to provide a sort function for their select list
 - Add log warning if node module required version cannot be satisfied
 - Handle empty credentials file. Closes #937
 - Add RPi.GPIO lib test for ArchLinux

#### 0.14.5: Maintenance Release

Fixes

 - Cannot clear cookies with http nodes
 - let HTML parse node allow msg.select set select
 - Validate nodes on import after any references have been remapped
 - Debug node handles objects without constructor property Fixes #933
 - Ensure 'false' property values are displayed in info panel Fixes #940
 - Fix node enable/disable over restart - load configs after settings init

#### 0.14.4: Maintenance Release

Nodes

 - Update trigger node ui to use typedInputs
 - Better handling of quotes in CSV node
 - Clarify the MQTT node sends msg.payload - closes #929
 - Inject node should reuse the message it is triggered with Closes #914
 - Stop trigger node re-using old message
 - Allow node.status text to be 'falsey' values

Fixes

 - Handle DOMException when embedded in an iframe of different origin Fixes #932
 - Fix double firing of menu actions
 - Fix select box handling in Safari - fixes #928
 - Clear context in node test helper Fixes #858
 - Allow node properties to be same as existing object functions Fixes #880
 - Handle comms link closing whilst completing the initial connect
 - Protect against node type names that clash with Object property names Fixes #917
 - Clone default node properties to avoid reference leakage
 - Strip tab node definition when exporting
 - Check for null config properties in editor before over-writing them
 - Add hasUsers flag to config nodes

Editor

 - Add sql mode to ace editor
 - Keyboard shortcuts dialog update (#923)
 - Ensure importing link nodes to a subflow doesn't add outbound links Fixes #921
 - Add updateConfigNodeUsers function to editor
 - Scroll to bottom when item added to editableList
 - Form input widths behave more consistently when resizing Fixes #919 #920

#### 0.14.3: Maintenance Release

Fixes

 - Create default setting.js in user-specified directory. Fixes #908
 - MQTT In subscription qos not defaulting properly
 - Let exec node handle 0 as well as "0"

#### 0.14.2: Maintenance Release

Fixes

 - Cannot add new twitter credentials. Fixes #913
 - Support array references in Debug property field

#### 0.14.1: Maintenance Release

Fixes

 - Handle undefined property that led to missing wires in the editor
 - Remove duplicate 'Delete' entry in keyboard shortcut window. Closes #911
 - Add 'exec' to node-red-pi launch script. Closes #910

#### 0.14.0: Milestone Release

Editor

 - Replace edit dialog with edit tray
 - Enable shift-drag detach of just the selected link
 - Allow workspace tabs to be re-ordered
 - Scope keyboard shortcuts to dom elements
 - Ensure parent nodes marked as changed due to child config node changes
 - Validate all edit dialog inputs when one changes
 - Add editableList widget and update Switch/Change nodes to use it
 - Add option to filter Debug sidebar by flow and highlight subflow-emitting nodes
 - Back off comms reconnect attempts after prolonged failures
 - Prompt for login if comms reconnect fails authentication
 - Change style of nodes in subflow template view
 - Add CHANGELOG.md and make it accessible from menu

Runtime

 - Always log node warnings on start without requiring -v
 - Add support for loading scoped node modules. Closes #885
 - Add process.env.PORT to settings.js
 - Clear node context on deploy. Closes #870
 - Enable finer grained permissions in adminAuth

Nodes

 - Enable config nodes to reference other config nodes
 - Add Split/Join nodes
 - Add Link nodes
 - Add support to HTTP In node for PATCH requests. Closes #904
 - Add cookie handling to HTTP In and HTTP Response nodes
 - Add repeat indicator to inject node label. Closes #887
 - Add javascript highlighter to template node
 - Add optional timeout to exec node
 - Add TLS node and update MQTT/HTTP nodes to use it
 - Let trigger node also send last payload to arrive
 - Add timestamp as a default typedInput and update Inject and change nodes to match,
 - Add QoS option to MQTT In node
 - Add status to exec spawn mode
 - Add Move capability to Change node
 - Update Serial node to support custom baud rates
 - Add support for array-syntax in typedInput msg properties
 - Add RED.util to Function node sandbox
 - Capture error stack on node.error. Closes #879


Fixes

 - Add error handling to all node definition api calls
 - Handle null return from Function node in array of messages
 - Defer loading of token sessions until they are accessed. Fixes #895
 - set pi gpio pin status correctly if set on start
 - Prevent parent window scrolling when view is focused. Fixes #635
 - Handle missing tab nodes in a loaded flow config
 - Ensure typedInput dropdown doesn't fall off the page
 - Protect against node types with reserved names such as toString. Fixes #880
 - Do not rely on the HTML file to identify where nodes are registered from
 - Preserve node properties on import
 - Fix regression in delay node. topic based queue was emptying all the time instead of spreading out messages.
 - Throw an error if a Function node adds an input event listener
 - Fix hang on partial deploy with disconnected mqtt node
 - TypedInput: preload type icons to ensure width calc correct
 - Ensure tcp node creates a buffer of size 1 at least
 - Return editorTheme default if value is undefined
 - Fix RED.util.compareObjects for Function created objects and Buffers
 - Ensure default settings copied to command-line specified userDir


#### 0.13.4: Maintenance Release

 - Add timed release mode to delay node
 - Enable link splicing for when import_dragging nodes. Closes #811
 - Fix uncaught exception on deploy whilst node sending messages
 - Deprecate old mqtt client and connection pool modules
 - Change node: add bool/num types to change mode Closes #835
 - Validate fields that are `$(env-vars)` Closes #825
 - Handle missing config nodes when validating node properties
 - Pi node - don't try to send data if closing
 - Load node message catalog when added dynamically
 - Split palette labels on spaces and hyphens when laying out
 - Warn if editor routes are accessed but runtime not started Closes #816
 - Better handling of zero-length flow files Closes #819
 - Allow runtime calls to RED._ to specify other namespace
 - Better right alignment of numerics in delay and trigger nodes
 - Allow node modules to include example flows
 - Create node_modules in userDir
 - Ensure errors in node def functions don't break view rendering Fixes #815
 - Updated Inject node info with instructions for flow and global options



#### 0.13.3: Maintenance Release

 - Fix crash on repeated inject of invalid json payload
 - Add binary mode to tail node
 - Revert Cheerio to somewhat smaller version
 - Add os/platform info to default debug



#### 0.13.2: Maintenance Release

 - Don't force reconnect mqtt client if message arrives (fixes the MQTT connect/disconnect endless cycle)
 - Add -p/--port option to override listening port
 - Invert config node filter toggle button colours so state is more obvious
 - Add timeout to httprequest node
 - Tidy up of all node info content - make style consistent
 - Make jquery spinner element css consistent with other inputs
 - tcp node add reply (to all) capability
 - Allow the template node to be treated as plain text
 - Validate MQTT In topics Fixes #792
 - httpNodeAuth should not block http options requests Fixes #793
 - Disable perMessageDeflate on WS servers - fixes 'zlib binding closed' error
 - Clear trigger status icon on re-deploy
 - Don't default inject payload to blank string
 - Trigger node, add configurable reset
 - Allow function properties in settings Fixes #790 - fixes use of httpNodeMiddleware
 - Fix order of config dialog calls to save/creds/validate
 - Add debounce to Pi GPIO node



#### 0.13.1: Maintenance Release

 - Revert wrapping of http request object



#### 0.13.0: Milestone Release

 - Add 'previous value' option to Switch node
 - Allow existing nodes to splice into links on drag
 - CORS not properly configured on multiple http routes Fixes #783
 - Restore shift-drag to snap/unsnap to grid
 - Moving nodes with keyboard should flag workspace dirty
 - Notifications flagged as fixed should not be click-closable
 - Rework config sidebar and deploy warning
 - Wrap http request object to match http response object
 - Add 'view' menu and reorganise a few things
 - Allow shift-click to detach existing wires
 - Splice nodes dragged from palette into links
 - try to trim imported/dragged flows to [ ]
 - Move version number as title of NR logo
 - Moving nodes mark workspace as dirty
 - Ok/Cancel edit dialogs with Ctrl-Enter/Escape
 - Handle OSX Meta key when selecting nodes
 - Add grid-alignment options
 - Add oneditresize function definition
 - Rename propertySelect to typedInput and add boolean opt
 - Add propertySelect to switch node
 - Add propertySelect support to Change node
 - Add context/flow/global support to Function node
 - Add node context/flow/global
 - Add propertySelect jquery widget
 - Add add/update/delete flow apis
 - Allow core nodes dir to be provided to runtime via settings
 - Tidy up API passed to node modules
 - Move locale files under api/runtime components
 - Add flow reload admin api



#### 0.12.5: Maintenance Release

 - Add attribute capability to HTML parser node
 - Add Pi Keyboard code node
 - Fix for MQTT client connection cycling on partial deploy
 - Fix for tcp node properly closing connections
 - Update sentiment node dependencies
 - Fix for file node handling of UTF8 extended characters



#### 0.12.4: Maintenance Release

 - Add readOnly setting to prevent file writes in localfilesystem storage
 - Support bcrypt for httpNodeAuth
 - Pi no longer needs root workaround to access gpio
 - Fix: Input File node will not retain the file name



#### 0.12.3: Maintenance Release

 - Fixes for TCP Get node reconnect handling
 - Clear delay node status on re-deploy
 - Update Font-Awesome to v4.5
 - Fix trigger to block properly until reset
 - Update example auth properties in settings.js
 - Ensure httpNodeAuth doesn't get applied to admin routes
 - TCP Get node not passing on existing msg properties



#### 0.12.2: Maintenance Release

 - Enable touch-menu for links so they can be deleted
 - Allow nodes to be installed by path name
 - Fix basic authentication on httpNode/Admin/Static
 - Handle errors thrown in Function node setTimeout/Interval
 - Fix mqtt node lifecycle with partial deployments
 - Update tcp node status on reconnect after timeout
 - Debug node not handling null messages
 - Kill processes run with exec node when flows redeployed
 - Inject time spinner incrementing value incorrectly



#### 0.12.1: Maintenance Release

 - Enable touch-menu for links so they can be deleted
 - Allow nodes to be installed by path name
 - Fix basic authentication on httpNode/Admin/Static



#### 0.12.0: Milestone Release

 - Change/Switch rules now resize with dialog width
 - Support for node 4.x
 - Move to Express 4.x
 - Copy default settings file to user dir on start up
 - Config nodes can be scoped to a particular subflow/tab
 - Comms link tolerates <5 second breaks in connection before notifying user
 - MQTT node overhaul - add will/tls/birth message support
 - Status node - to report status events from other nodes
 - Error node can be targeted to specific other nodes
 - JSON node can encode Array types
 - Switch node regular expression rule can now be set to be case-insensitive
 - HTTP In node can accept non-UTF8 payloads - will return a Buffer when appropriate
 - Exec node configuration consistent regardless of the spawn option
 - Function node can now display status icon/text
 - CSV node can now handle arrays
 - setInterval/clearInterval add to Function node
 - Function node automatically clears all timers (setInterval/setTimeout) when the node is stopped



#### 0.11.2: Maintenance Release

 - Allow XML parser options be set on the message
 - Add 'mobile' category to the palette (no core nodes included)
 - Allow a message catalog provide a partial translation
 - Fix HTTP Node nls message id
 - Remove delay spinner upper limit
 - Update debug node output to include length of payload




#### 0.11.1: Maintenance Release

 - Fix exclusive config node check when type not registered (prevented HTTP In node from being editable unless the swagger node was also installed)



#### 0.11.0: Milestone Release

 - Add Node 0.12 support
 - Internationalization support
 - Editor UI refresh
 - Add RBE node
 - File node optionally creates path to file
 - Function node can access `clearTimeout`
 - Fix: Unable to login with 'read' permission



#### 0.10.10: Maintenance Release

 - Fix permissions issue with packaged nrgpio script
- Add better help message if deprecated node missing



#### 0.10.9: Maintenance Release

Fix packaging of bin scripts



#### 0.10.8: Maintenance Release

- Nodes moved out of core
  - still included as a dependency: twitter, serial, email, feedparser
 - no longer included: mongo, arduino, irc, redis
- node icon defn can be a function
- http_proxy support
- httpNodeMiddleware setting
- Trigger node ui refresh
- editorTheme setting
- Warn on deploy of unused config nodes
- catch node prevents error loops



#### 0.10.6: Maintenance Release

Changes:
 - Performance improvements in editor
 - Palette appearance update
 - Warn on navigation with undeployed changes
 - Disable undeployed node action buttons
 - Disable subflow node action buttons
 - Add Catch node
 - Add logging functions to Function node
 - Add send function to Function node
 - Update Change node to support multiple rules



#### 0.10.4: Maintenance Release

Changes:

- http request node passes on request url as msg.url
- handle config nodes appearing out of order in flow file - don't assume they are always at the start
- move subflow palette category to the top, to make it more obvious
- fix labelling of Raspberry Pi pins
- allow email node to mark mail as read
- fix saving library content
- add node-red and node-red-pi start scripts
- use $HOME/.node-red for user data unless specified otherwise (or existing data is found in install dir)



#### 0.10.3: Maintenance Release

Fixes:

 - httpAdminAuth was too aggressively deprecated (ie removed); restoring with a console warning when used
 - adds reporting of node.js version on start-up
 - mongo node skip/limit options can be strings or numbers
 - CSV parser passes through provided message object



#### 0.10.2: Maintenance Release

Fixes:
 - subflow info sidebar more useful
 - adds missing font-awesome file
 - inject node day selection defaulted to invalid selection
 - loading a flow with no tabs failed to add nodes to default tab
