#### 0.18.4: Maintenance Release

Projects

 - Ensure sshkey file path is properly escaped on Windows
 - Normalize ssh key paths for Windows file names
 - Ensure userDir is an absolute path when used with sshkeygen
 - Detect if there are no existing flows to migrate into a project
 - Use relative urls when retriving flow history
 - Add credentialSecret to clone pane
 - Delay clearing inflight when changing credentials key
 - Mark deploy inflight when reverting a file change
 - Handle missing_flow_file error on clone properly
 - Remote project from cached list on delete so it can be reused
 - Fix tests for existing file flag in settings

Editor Fixes

 - Fix merging a remote diff
 - Fixed the problems when using a node without defaults
 - Disable user defined icon for subflow
 - getDefaultNodeIcon should handle subflow instance nodes Fixes #1635
 - Add Japanese info text for core nodes
 - Fix message lookup for core nodes in case of i18 locales directory exists
 - Prevent the last tab from being deleted

Node Fixes

 - Ensure trigger gets reset when 2nd output is null


#### 0.18.3: Maintenance Release

Projects

 - Fix permissions on git/ssh scripts
 - Add support for GIT_SSH on older levels of git
 - Handle host key verification as auth error
 - Ensure commit list has a refs object even if empty
 - Make git error detection case-insensitive
 - Fix up merge conflict handling
 - Use flow-diff when looking at flow file changes

Node Fixes

 - Ensure debug tools show for 'complete msg object'
 - Fix msg.parts handling in concat mode of Batch node

Editor Fixes

 - Fix offset calculation when dragging node from palette
 - Allow a library entry to use non-default node-input- prefixes
 - Change remote-diff shortcut and add it to keymap Fixes #1628

#### 0.18.2: Maintenance Release

Projects

 - Filter out %D from git log command for older git versions
 - Ensure projects are created as logged in user
 - Better error handling/reporting in project creation
 - Add Project Settings menu option
 - Refresh vc sidebar on remote add/remove
 - Fix auth prompt for ssh repos
 - Prevent http git urls from including username/pword
 - Fix fetch auth handling on non-default remote
 - Avoid exception if git not installed
 - Check version of git client on startup
 - Fix pull/push when no tracked branch
 - Add git_pull_unrelated_history handling
 - Handle delete of last remote in project settings

Node Fixes

 - Fix and Add some Chinese translations
 - Update sort/batch docs
 - Don't assume node has defaults when exporting icon property
 - Ensure send is last thing trigger does
 - Ensure trigger doesn't set two simultaneous timeouts
 - Add missing property select var to HTML node
 - Add a default keepalive to tcp client mode
 - Move node.send in exec and httprequest nodes


#### 0.18.1: Maintenance Release

Projects

 - Handle more repo clone error cases
 - Relax validation of git urls
 - Revalidate project name on return to project-details view
 - Avoid unnecessary project refresh on branch-switch Fixes #1597
 - Add support for file:// git urls
 - Handle project first-run without existing flow file
 - Handle delete of last remote in project settings
 - Add git_pull_unrelated_history handling
 - Fix pull/push when no tracked branch
 - Remember to disable projects in editor when git not found

Node Fixes

 - Trigger node migration - ensure bytopic not blank
 - Add HEAD to list of methods with no body in http req node #1598
 - Do not include payload in GET requests Fixes #1598
 - Update sort/batch docs Fixes #1601
 - Don't assume node has defaults when exporting icon property


#### 0.18: Milestone Release

Runtime

 - Beta: Projects - must be enabled in settings file
 - Allow port zero for Express (#1363)
 - Better error reporting when module provides duplicate type
 - Update jsonata to 1.5.0
 - add express-session memorystore without leaks (#1435)
 - Allow adminAuth.user to be a Function Fixes #1461
 - Ensure RED.server is set even if admin api disabled
 - Ensure strategy login button uses relative URL Fixes #1481
 - ignore `_msgid` when merging full objects
 - Move node install to spawn to allow for big stdout Fixes #1488
 - SIGINT handler should wait for stop to complete before exit

Editor

 - allow a node's icon to be set dynamically (#1490)
 - Batch messages sent over comms to increase throughput
 - Migrate deploy confirmations to notifications
 - `oneditdelete` should be available to all node types Closes #1346
 - Sort typeSearch results based on position of match
 - Update ACE to test and add python highlighter (#1373)
 - Clear mouse state when typeSearch cancelled Fixes #1517
 - Handle scoped modules via palette editor
 - TypedInput: handle user defined value/labels options Fixes #1549

Nodes

 - add msg. select to range and yaml nodes
 - add property choice to xml, sentiment nodes
 - mqtt: Add 'name' to mqtt-broker node, and label it by this if it is set. (#1364)
 - Add option to JSON node to ensure particular encoding
 - add parts support for HTML node (#1495)
 - Add passphrase to TLS node
 - Add rc property to exec node outputs 1 and 2 (#1401)
 - Add skip first n lines capability to csv node (#1535)
 - Add support for rejectUnauthorized msg property
 - Add TLS options to WebSocket client
 - Added parsed YAML support for template node (#1443)
 - Allow delay node in rate-limit mode to be reset Fixes #1360
 - Allow setTimeout in Function node to be promisified in node 8
 - Debug to status option (#1499)
 - enable template config via msg.template for stored or generated templates (#1503)
 - HTTP REQUEST: Adding PROPPATCH and PROPFIND http methods (#1531)
 - Initial support of merge & reduce mode for JOIN node (#1546)
 - Initial support of new BATCH node (#1548)
 - Initial support of sequence rules for SWITCH node (#1545)
 - initial support of SORT node (#1500)
 - Inject node - let once delay be editable (#1541)
 - Introduce `nodeMaxMessageBufferLength` setting for msg sequence nodes
 - Let CSV correct parts if we remove header row.
 - let default apply if msg.delay not set in override mode. (#1397)
 - let trigger node be reset by boolean message (#1554)
 - Let trigger node support per topic mode (#1398)
 - let HTML node return empty array for no matching input (#1582)
 - MQTT node - if Server/URL config contains '//' use it as a complete url; enabled ws:// and wss://
 - clone messages before delayed send (#1474)
 - Decrement connected client count rather than show disconnected
 - Don't end mqtt client on first error Fixes #1566
 - File out - create dirs synchronously to ensure they exist Fixes #1489
 - Fix debug message format for Buffer (#1444)
 - Fix global.keys() bug in function node (#1417)
 - Handle escape characters in template node which uses Mustache format and JSON output mode (#1377)
 - Move all node.send to end of timer functions in trigger node (issue #1527) (#1539)
 - Publish null/undefined to mqtt as blank not toString Fixes #1521
 - remove inject node at specific time spinner
 - restrict inject interval to less that 2^31 millisecs
 - tag UDP ports in use properly so they get closed correctly (#1508)

#### 0.17.5: Maintenance Release

 - Add express-session missing dependency for oauth
 - Fix improper type tests is core test cases
 - File node: recreate write stream when file deleted Fixes #1351
 - Add flow stopping trace messages
 - Fix userDir test case when .config.json exists (#1350)
 - Do not try to send msg after http request error handled Fixes #1344
 - Fix boundary problem in range node (#1338)
 - Modify messages in node properties to refer messages.json (#1339)
 - Fix settings.js replacing webSocketVerifyClient by webSocketNodeVerifyClient (#1343)


#### 0.17.4: Maintenance Release

 - Add request node test case for POSTing 0
 - Allow false and 0 in payload for httprequest (#1334)
 - Add file extension into flow name of library automatically (#1331)
 - Fix accessing global context from jsonata expressions Fixes #1335
 - Disable editor whilst a deploy is inflight Fixes #1332
 - Replace Unknown nodes with their real versions when node loaded
 - Retry auto-install of modules that fail
 - Fix column name in link nodes to refer language file (#1330)
 - Use namespaces with link node title attributes i18n name Fixes #1329
 - Tidy up GPIO pin table presentation Fixes #1328
 - Join: count of 0 should not send on every msg
 - Handle importing only one end of a link node pair
 - Make sending to Debug synchronous again Fixes #1323
 - Make send-error behaviour optional in file node
 - Restore File In node behaviour of sending msg on error
 - Expose context.keys within Function node
 - JSON parser default should be not formatting output


#### 0.17.3: Maintenance Release

 - Fix flow library in menu to support period characters as flow name (#1320)
 - editorTheme not setting custom css/scripts properly
 - Fix missing icons for some nodes (#1321)
 - Add reformat button to JSONata test data editor
 - Update delay node status without spawning unnecessary intervals
 - Avoid stringify ServerResponse and Socket in Debug node Fixes #1311
 - Fix creating userDir other than system drive on Windows (#1317)
 - Trigger node not handling a duration of 0 as block mode Fixes #1316
 - Unable to config GPIO Pin 13 Fixes #1314

#### 0.17.2: Maintenance Release

 - Fix GPIO node labels

#### 0.17.1: Maintenance Release

 - Fix PI gpio to use BCM
 - Prevent event thread contention when sending to Debug node Closes #1311
 - Fix Bug: Can not display node icon when npm package has scope (#1305) (#1309)
 - Clear moved flag when nodes are deployed

#### 0.17: Milestone Release

Runtime

 - Return flow rev on reload api when api v2 enabled Closes #1273
 - Provide single endpoint to load all node message catalogs
 - Add .trace and .debug to Node prototype
 - Rename oauth auth scheme to strategy as it works for openid
 - Allow oauth schemes provide a custom verify function
 - Add support for oauth adminAuth configs
 - Cache auth details to save needlessly recalculating hashes
 - Add context.keys function to list top-level keys
 - Strip BOM character from JSON files if present Fixes #1239
 - Version check no meta (#1243)
 - Ensure all nodes have access to global context Fixes #1230
 - Don't process subscription for unauthenticated comms link Fixes #851
 - Clone credentials when passing to node Fixes #1198
 - Resolve dir argument of getLocalNodeFiles function (#1216)
 - Add wait for writing a library entry into a file. (#1186)
 - Use correct Buffer.from method rather than constructor
 - update core nodes to use newer Buffer syntax
 - Treat missing msg properties as undefined rather than throw error Fixes #1167
 - Allows flows to be enabled/disabled in the runtime
 - add off option to logging settings comment
 - Log error stack traces if verbose flag is set
 - Extract line number if available from node load errors
 - Add node 8 to travis (with allow failure)
 - Shuffle promises for creating default package.json
 - Create a package.json file in userDir if one doesn't exist
 - autoInstallModules option must honour version/pending_version
 - Refuse to update a non-local node module
 - Finalise nodeSettings and update tlsConfigDisableLocalFiles
 - Allow a node to declare what settings should be made available to the editor. (#1185)
 - Add node whitelist function (#1184)
 - Allow a node to declare settings that should be exported
 - Add test coverage for deleting a flow
 - Update tests for oauth -> strategy rename
 - Fix the test cases which sometimes fails due to timing. (#1228)
 - Extend timeout for the test case of installing non-existant path. (#1191)
 - Fix loader test to expect line numbers in load errors
 - Update ui_spec for icon module path
 - let node installer try to save with ~ version prefix to allow minor updates
 - Log error when non-msg-object is returned from a Function
 - Timeout a node that fails to close - default 15s timeout
 - Pass a 'removed' parameter to node close handler
 - Remove event passing for icons/examples from the api layer
 - Update general dependencies

Nodes

 - Do not log node errors if handled by a Catch node
 - Fix wrong number of double quotes in CSV parsing
 - let csv node handle ip addresses without trying to parse
 - Update debug node to register the settings it uses
 - Handle IncomingMessage/ServerResponse object types in debug Fixes #1202
 - Toggling debug node enabled/disabled state should set state dirty Fixes #1203
 - redo delay node status messages to be interval based
 - Update delay node ui
 - Add new msg.delay option to delay node
 - stop delay node spamming web socket (when in fast rate limit mode)
 - Delay/Range node help tidy up
 - Bug fix in exec node. White spaces in arguments now works (#1285)
 - Make exec node explicitly call SIGTERM for default
 - Fix exec node error tests on Windows (#1234)
 - update messages for updated exec node
 - Make exec node spawn and exec outputs more consistent
 - Exec node for windows environment (#1200)
 - remove requirement for cmd in exec node config + new style info
 - retry exec node tests
 - let exec node take msg.kill SIG... param and pid param
 - Third output from Exec node must be consistent for success/failure conditions
 - exec node returns 0 on the third output if command ended without error. (#1160)
 - exec node can be killed on demand
 - add "split/stream" ability to file in node
 - add port label to file node and update info
 - Allow nodes to have translations not in core (#1183)
 - fix tcp node new Buffer alloc size 0
 - change pin selection table for pi gpis nodes
 - stop using sudo for Pi gpio access
 - adding frequency configuration to pwm output (#1206)
 - Fix Pi GPIO debounce
 - let Hypriot on Pi detect gpio correctly
 - More core node info help tidy up
 - Tidy up more core node help text
 - Tidy up parser node edit dialogs and help text
 - yet more core node info updates
 - more core node info updates to newer style
 - Update some core nodes info
 - First pass of new node-info style
 - MQTT new style info
 - Fix empty extra node help content issue
 - Handle HTTP In url that is missing its leading / Fixes #1218
 - Add file upload support to HTTP In node
 - HTTP Request node: add info on how to do form encoding
 - Prevent unmodified msg.headers from breaking HTTP Request flows Closed #1015
 - Add cookie handling to HTTP Request node
 - Add guard against the http-request buffer fix being reverted
 - Multipart streaming
 - Add http-request node unit tests
 - http request node add transport validity check and warn.
 - Update follow_redirects to fix http_proxy handling Fixes #1172
 - Allow statusCode/headers to be set directly within HTTP Response node
 - let inject "between time" also fire at start - Plus new info
 - remove repeat symbol from inject if repeat is 0
 - Add port labels to inject node (to show types)
 - Add buffer joiner mode to Join node
 - Let join node auto re-assemble buffers
 - let join also accumulate strings (and not fail)
 - Add Pretty print option to JSON node and
 - Fix selection of link nodes
 - Add link label value as portLabels
 - Add sentence about clearing retained topic on mqtt
 - make sure MQTT client closes if redeploy during reconnect
 - make sure MQTT client closes if redeploy during reconnect
 - slight filed size adjust for mqtt broker port field - allow 5 digits
 - Add help info for split node
 - split node - in object mode allow msg.complete on its own
 - let split of objects use key to set another property (e.g. topic)
 - adding streaming modes into split node
 - let split node reassemble based on a final packet. (as well as the first)
 - Add buffer support to split node
 - updated split/join node (split still needs work before release)
 - Added a name icon and a description label on edit subflow window.
 - Don't display port labels for subflow pseudo-port nodes
 - Added a name icon and a description label on edit subflow window.
 - tcp request - remove confusing timeout wording from info
 - Final TCP node nits - let 0 do it's thing as per every other timeout
 - fix tcp port not waiting as per info/previous behaviour
 - TCP In: Fix error in timout callback (#1249)
 - Make tcp send msg more consistent
 - Update 31-tcpin.js (#1235)
 - really close tcp node connection right away (if told to)
 - clone message before send in stay connected mode
 - Better template node help example
 - Add option to parse Template result as JSON before sending
 - nail trigger test for windows AND linux
 - give up on SIGQUIT for widows test
 - better tests for windows nodes
 - comment out 2nd exec node kill tests
 - fixes for grunt files tests on Windows
 - Add events to test helper
 - Change default value of tlsConfigDisableLocalFiles to false
 - Add the node setting tlsConfigDisableLocalFiles for tls node. (#1190)
 - UI to upload certificates and keys for TLS node
 - Update trigger help
 - let trigger node set repeated outputs
 - Move udp sock error listener to only be instantiated once.
 - Let watch node recurse into subdirectories
 - Misconfigured WebSocket nodes should not register msg handlers
 - Add websocketVerifyClient option to enable custom websocket auth Fixes #1127

Editor

 - Bump ACE editor to v1.2.7
 - Add RED.utils.getNodeLabel utility function
 - Include module name in requests for node icons
 - Change debug message menu icon
 - Handle empty array/objects in debug view
 - Add per-node filter option to Debug pane
 - Ensure debug node marked changed when button pressed
 - Fix pop-out debug window for all the recent updates
 - Add debug message menu
 - Don't include msg. in debug message copied paths
 - Format Buffer numbers as hex by default
 - Remember formatting choices for dbg msg elements
 - Allow debug msg elements to be pinned
 - Only show debug tools under the debug tab
 - Fix test for valid js identifiers in debug path construction
 - Remove unused modified flag on debug messages
 - Add copy path/value buttons to debug messages
 - dont match only part of the node type (#1242)
 - Add editorTheme.logout.redirect to allow redirect on logout Closes #1213
 - Handle logging out and already logged-out editor Fixes #1288
 - Fix bug: Export Subflows (#1282)
 - destroy editor to ensure fully removed on close (function, template, comment)
 - Don't try to nls status text starting with '.' Fixes #1258
 - Add note of removed flows in diffConfig (#1253)
 - Add description to flow same as subflow
 - Allow tabs to be enabled/disabled in the editor
 - Make H3 sections in node help collapsible
 - Add JSON Expression editor
 - Expression editor - clear legacy flag for blank expressions
 - Ensure node labels are reordered properly to match outputs
 - Add 'none' placeholder for empty port label form
 - Don't mark a node changed when going from none to blank labels
 - Leave a node to nls its own port labels
 - Allow a node to override default labels
 - Add placeholder text on label inputs and clear buttons
 - Add port labels to Subflow nodes
 - Keep port label form in sync with output reordering
 - Basic node label editor
 - Port label editor starting point
 - Allow port labels be i18n identifiers
 - Add inputLabels and outputLabels to node defn + Update Change node
 - Resize port labels based on content
 - Initial port label behaviour
 - Allow a node to decide for itself if its button should be enabled or not
 - Provide feedback when enable/disable node fails
 - Add node module update api and expose in palette editor
 - Reset palette-manager tabs when settings dialog reopened
 - Move palette editor to settings panel
 - Move palette editor to userSettings dialog
 - Move view and keyboard into user settings dialog
 - Add basic user settings panel
 - Node status should be on by default
 - Make theme able to load custom javascript (#1211)
 - Allow tips to be hidden and cycled through
 - Add info tips back to the sidebar
 - Add buffer mode to typedInput
 - Add typedInput binary mode icon
 - Ensure all ace editors are destroyed in the expression editors
 - Refresh sidebar info when tab is changed
 - better spacing for library widget
 - Fix gridSize for node width calculation to avoid odd resizing
 - Redraw grid properly if gridSize changes
 - Scroll sidebar info tab to top when changing content
 - Ensure info tab sections are collapsible when set from palette
 - Only show tab info if there is an active tab
 - Only check for reordered outputs if outputMap defiend
 - Avoid circular references when stingifying node objects
 - Fix padding of config node edit dialog
 - Add force-deploy option when conflict detected
 - Hide tip box on startup if disabled
 - Track node moves separately to node config changes
 - Ensure ace editor instances are freed if edit cancelled
 - Clip overly long notification messages
 - Use queryCommandSupported not queryCommandEnabled to check for copy support
 - Add tip to tab description editor
 - Make tab info edit box resizable
 - Shrink config node appearance in info table
 - Display config nodes in Info sidebar table
 - Ensure flow info box updates after editing flow
 - Hide Node info section when displaying changelog
 - Restructure info tab
 - Provide notification when new flows deployed in the background
 - Stop some ui elements from clearing url anchor when clicked
 - clipboard export text stay highlighted even when button deselected
 - ensure export clipboard keeps text selected and formatted
 - Defer resizing tray components until they have finished building
 - Use pre-calculated values for connection path
 - Use textContent to avoid manual escaping
 - Add RED.stack as a common ui component
 - Numeric validator that accepts blank should accept undefined
 - Add visual cue as to whether the workspace is focused
 - Allow RED.validators.number to allow blank values as valid
 - Support dropping json files into the editor
 - NLS Expression/JSON editor and fix their height calculation
 - Update JSONata to 1.2.4 Closes #1275
 - Remember test expression data on a per-node basis
 - NLS jsonata test messages
 - Add JSONata expr tester and improved feedback
 - Add $context/$flow/$global functions to jsonata
 - Update jsonata

Other

 - add allow es6 to .jshintrc
 - travis - don't allow node 8 fails, (and re-add 7)
 - ask istanbul for more reports as default
 - Add istanbul to Gruntfile.js (#1189)


#### 0.16.2: Maintenance Release

 - Ensure custom mustache context parent set in Template node fixes #1126
 - Display debug node name in debug panel if its known
 - Ensure auth-tokens are removed when no user is specified in settings
 - Ensure all a tags have blank target in info sidebar
 - Ensure links do not span tabs in the editor
 - Avoid creating multiple reconnect timers in websocket node
 - Fix inner reference in install fail message catalog entry Fixes #1120
 - Display buffer data properly for truncated buffers under Object property

#### 0.16.1: Maintenance Release

 - Add colour swatches to debug when hex colour matched
 - Nodes with hasUsers set to false should not appear unused
 - Change hard error to verbose warning if using old node.js level
 - Don't filter debug properties starting with _ Fixes #1117
 - Node logged errors not displayed properly in debug pane Fixes #1116
 - Do not look for existing nodes when checking for wires on paste Fixes #1114
 - -v option not enabling verbose mode properly
 - Add node.js version check on startup

#### 0.16.0: Milestone Release

Runtime

 - Drop support for node 0.10 and 0.12

Nodes

 - Add option to colourise debug console output Closes #1103
 - Add property validation to nodes using typedInput
 - Add common validator for typedInput fields Closes #1104
 - Update debug node console logging indicator icon Closes #1094
 - Let exec node (spawn) handle commands with spaces in path
 - Add symbol to debug node to indicate debugging also to console.log
 - Change file node to use node 4 syntax (drops support for 0.8)
 - add info for httprequest responseUrl property
 - Add res.responseUrl to httprequest node response
 - Add support for flow and global context in Template node (#1048)
 - Added YAML parser node (#1034)
 - node-red-node-serialport removed as a default node

Editor

 - Add install/remove dialog to increase friction Closes #1109
 - Report node catalogue load errors Closes #1009
 - Properly report module remove errors in palette editor Fixes #1043
 - Update rather than hide install button after success install
 - Tweak search box styling
 - Display info tips slightly longer
 - Allow tips to be enabled/disabled via menu option
 - Info-tips update
 - Make typedInput keyboard navigable
 - update Font Awesome to 4.7.0
 - Add expression editor for jsonata
 - Overhaul keyboard handling and introduce editor actions
 - Add Japanese translation file(editor.json) (#1084)
 - Add quick-add node mode with cmd/ctrl-click
 - Add cmd/ctrl-click to quick add wires
 - Use json-stringify-safe to detect circular references in debug msgs
 - debug - format if time if correct length/range
 - Make Debug object explorable
 - Initial debug pop-out window
 - Add proper three-way diff view
 - Focus tray body when edit dialog opened
 - Hit enter to edit first node in selection
 - Add node delete button to edit dialog
 - Add notification when runtime stopped due to missing types Part of #832

Fixes

 - Do not tie debug src loading to needsPermission Fixes #1111
 - Initialise nodeApp regardless of httpAdmin setting Closes #1096 #1095
 - Speed up reveal of search dialogs
 - Ensure flows exist before delegating status/error events Fixes #1069
 - Update package dependencies
 - Update MQTT to latest 2.2.1
 - Node status not being refreshed properly in the editor
 - Try to prevent auto-fill of password fields in node edit tray Fixes #1081
 - Fix whitespace in localfilesystem
 - fix bug where savesettings did not honor local settings variables (#1073)
 - Tidy up unused/duplicate editor messages Closes #922
 - Property expressions must not be blank
 - Tidy up merge commit of validatePropertyExpression
 - add port if wires array > number of ports declared.
 - Allow quoted property expressions Fixes #1101
 - Index all node properties for node search
 - Remove node 0.10 from travis config
 - update welcome message to use logger so it can be turned off/on if required (#1083)
 - Fix dynamically loading multiple node-sets from palette editor
 - Allow a node to reorder its outputs and maintain links Fixes #1031

#### 0.15.3: Maintenance Release

 - Tcpgetfix: Another small check (#1070)
 - TCPGet: Ensure done() is called only once (#1068)
 - Allow $ and _ at start of property identifiers Fixes #1063
 - TCPGet: Separated the node.connected property for each instance (#1062)
 - Corrected 'overide' typo in XML node help (#1061)
 - TCPGet: Last property check (hopefully) (#1059)
 - Add additional safety checks to avoid acting on non-existent objects (#1057)
 - add --title for process name to command line options
 - add indicator for fire once on inject node
 - reimplement $(env var) replace to share common code.
 - Fix error message for missing node html file, and add test.
 - Let credentials also use $(...) substitutions from ENV
 - Rename insecureRedirect to requireHttps
 - Add setting to cause insecure redirect (#1054)
 - Palette editor fixes (#1033)
 - Close comms on stopServer in test helper (#1020)
 - Tcpgetfix (#1050)
 - TCPget: Store incoming messages alongside the client object to keep reference
 - Merge remote-tracking branch 'upstream/master' into tcpgetfix
 - TCPget can now handle concurrent sessions (#1042)
 - Better scope handling
 - Add security checks
 - small change to udp httpadmin
 - Fix comparison to "" in tcpin
 - Change scope of clients object
 - Works when connection is left open
 - First release of multi connection tcpget
 - Fix node.error() not printing when passed false (#1037)
 - fix test for CSV array input
 - different test for Pi (rather than use serial port name)
 - Fix missing 0 handling for css node with array input


#### 0.15.2: Maintenance Release

 - Revert bidi changes to nodes and hide menu option until fixed Fixes #1024
 - Let xml node set options both ways
 - Bump serialport to use version 4
 - gpio node handle multiple bits of data returned in one go
 - HTTP In should pass application/octet-stream as buffer not string Fixes #1023
 - Handle missing httpNodeRoot setting properly
 - Config sidebar not handling node definition error properly
 - Add minimum show time to deploy spinner to avoid flicker
 - Add work-in-progress update button to palette-editor
 - Add log.removeHandler function
 - Add Crtl/Shift/p shortcut for manage palette
 - Add spinner to deploy button
 - Status messages from nodes in subflows not delegated properly Fixes #1016
 - fix spelling in join node info
 - Speed up tab scrolling
 - Update delay burst test to be more tolerant of timing Fixes #1013

#### 0.15.1: Maintenance Release

 - Update default palette catalogue to use https
 - Disable palette editor if npm not found - and fix for Windows
 - Searching package catalogue should be case-insensitive Fixes #1010
 - contenteditable fields not handled in config nodes Fixes #1011
 - Change html link refs from `_new` to `_blank` to be standards compliant

#### 0.15.0: Milestone Release

Runtime

 - Increase default apiMaxLength to 5mb and add to default settings Closes #1001
 - Add v2 /flows api and deploy-overwrite protection
 - Encrypt credentials by default
 - Ensure errors thrown by RED.events handlers don't percolate up

Editor

 - Mark nodes as changed when they are moved
 - Added parent containment option for draggable. (#1006)
 - Ignore bidi event handling on non-existent and non-Input elements Closes #999
 - Remove list of flows from menu
 - Allow nodes to be imported with their credentials
 - Add workspace search option
 - Add scrollOnAdd option to editableList
 - Add swift markup to editor for open whisk node
 - Scrollable tabs 👍
 - Allow linking to individual flow via url hash
 - Avoid duplicating existing subflows on import
 - Add import-to-new-tab option
 - Add new options to export-nodes dialog
 - Stop nodes being added beyond the outer bounds of the workspace
 - Default config nodes to global scope unless in a subflow Closes #972
 - Bidi support for Text Direction and Structured Text (#961)
 - Fix jQuery selector, selecting more than one help pane/popover and displaying incorrectly. (#970)
 - Fixes removeItem not passing row data to callback. (#965)
 - Move common components and add searchBox
 - Add initial palette sidebar

Nodes

 - Inject node label - show topic for timestamp mode if short
 - Let change node set type if total match
 - Clean up status on close for several core nodes.
 - Change node: re-parse JSON set value each time to avoid pass-by-ref
 - Better handle HTTP Request header capitalisation
 - Enable ES6 parsing in Function editor by default Fixes #985
 - Update debug sidebar to use RED.view.reveal to show debug nodes
 - Add full path tip to file node, And tidy up Pi node tips
 - Remove WebSocket node maxlistener warning
 - Update mqtt-broker node to use fully name-space qualified status messages
 - Let UDP node better share same port instance if required
 - Add number of units to the delay node (rate) (#994)
 - Allow http middleware to skip rawBodyParser
 - Let change node move property to sub-property.
 - Add info to exec warning about buffered output if using python
 - TCP node: pass on latest input msg properties
 - Make sure MQTT broker is really set
 - Fix escape character catch in TCPGet + support 0x?? sequences
 - Fix split character in TCP Request node
 - Add CSS highlighting to the template node (#950)
 - Only update switch previous value after all rules are run

Other

 - Add npm build/test scripts Closes #946 #660
 - Move travis to node 6 and 7 - drop 5 and 0.12


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
