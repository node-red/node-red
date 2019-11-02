#### 1.0.2: Maintenance Release

Runtime
 - Allow node.status() to be passed number/bool types
 - Allow node emitted events to have multiple arguments
 - #2323 Fixed docstrings to have them match the function signature (name of parameters).
 - #2318 NLS: Unify translations of "boolean"

Editor
 - Ensure node status is refreshed whenever node is edited
 - #2315 #2316 Ensure z property included in full message debug payload
 - #2321 Fixed editor.json (JA nls)
 - #2313 Fix element to collapse items in visual JSON editor
 - #2314 Insert divider in menu by calling RED.menu.addItem('id', null);

Nodes
 - Change: Fixup use of node.done
 - #2322 Template: Fix invalid JSON data in template node docs
 - #2320 File: Fixed a typo in 10-file.html (JA nls)
 - #2312 Template: Remove unnecessary comma in help text
 - #2319 Inject: Interval of inject node should be 596 hours or less.

#### 1.0.1: Maintenance Release

Runtime
 - #2301 Add env vars to enable safe mode and projects
   - `NODE_RED_ENABLE_SAFE_MODE`
   - `NODE_RED_ENABLE_PROJECTS`

Editor
 - #2308 Fix grid setting
 - #2306 i18n support in tooltips
 - Fix error when setting typedInput to boolean true/false
 - #2299 Fix SVG icons in IE11
 - #2303 Fix issue where subflow color did not update when not on a flow

Nodes
 - #2297 TLS: Allow TLS config node to provide just CA cert
 - #2307 Inject: Fix width on inject node property
 - #2305 Switch: Let switch node between rule work both ways round
 - Range: Add example to range node info and make use of target consistent
 - Join: node must clone group message before sending


#### 1.0.0: Milestone Release

Editor
 - Add click-on-tooltip to close
 - Fix node draggable handling
 - Ensure complete node scope property is remapped on import
 - Update i18n for project feature
 - Fix menu hiding function for flow editor
 - Normalise default subflow color references
 - Hide header text of very small screens to deploy is visible
 - Fix tab access on touch screens
 - Update radialMenu to use standard theme colours
 - Fix undefined reference loading on mobile
 - Allow word breaking of node name with long word
 - Enable wrap mode in Markdown editor
 - Maximize the size of markdown editor

Nodes
 - remove legacy error option from file in mode
 - Change MQTT node default 3.1 compatibility mode to false
 - Show clear debug shortcut in tooltip
 - Fix file-in port labels for all 4 options
 - Add extra comment re Mustache escapes to Template info
 - Fix typo in complete node
 - Allow Function node output input to go to 0

#### 1.0.0-beta.4: Beta Release

Runtime
 - Clone the first message passed to node.send in Function node

Editor
 - Move flow-status button to footer for consistency
 - Fix node hover effect to prevent jumping position
 - Filter quick-add properly when splicing a wire
 - Mark workspace dirty when deleting link node link Fixes #2274
 - Add red-ui-button class to strategy login button
 - Fix padding of subflow locale select Closes #2276
 - Update info text of complete node & add JP text
 - Add class red-ui-button to cancel button
 - Add css class to login submit button (#2275)
 - Realign subflow output port labels
 - Move context sidebar auto-refresh option to individual sections
 - Update Japanese message catalogue
 - Fix subflow UI for select
 - remove padding before label text for SUBFLOW UI row
 - Allow SUBFLOW UI label row without variable name

Nodes
 - Remove old rc option from exec node for 1.0
 - Add python and SQL to template language options
 - Fix Switch node display of jsonata_exp type
 - Remove sentiment from core nodes

#### 1.0.0-beta.3: Beta Release

Runtime
 - [FEATURE] Add Node Done API - make message passing async
 - Ensure the subflow stop promise is waiting for before restarting
 - Limit the regex for the /nodes/ api end points
 - Add error event handler to ssh-keygen child_process Fixes #2255
 - Fix default value handling on context array access Fixes #2252
 - Remove all ui test dependencies from package.json
 - Add req back to audit log events and extend to Projects api
 - Ensure 2nd arg to node.error is an object Fixes #2228
 - Use a more atomic process for writing context files Fixes #2271


Editor
 - [FEATURE] Change core node categories
 - [FEATURE] Subflow Instance property UI (#2236)
 - [FEATURE] Add visual JSON editor
 - [FEATURE] Add Action List dialog
 - [FEATURE] Add new shortcut to clear debug message list - ctrl-alt-l
 - [FEATURE] Add show-library dialog actions
 - [FEATURE] Add shift-cursor handling for moving quick-add dialog
 - [FEATURE] Add enable/disable-flow actions
 - [FEATURE] Add actions to change deploy type
 - [FEATURE] Allow config nodes to be disabled, tidy css and add actions
 - [FEATURE] Add default shortcut (ctrl-d) for deploy
 - [FEATURE] Initial implementation of redo (un-undo) - ctrl-y
 - [FEATURE] add support for specifying subflow template color
 - [FEATURE] Use ctrl-click on wire to splice node in place
 - [FEATURE] Allow search results to show more than 25 results
 - [FEATURE] Allow a node to change if it has an input port Closes #2268
 - Revealing node position needs to account for zoom level Fixes #2172
 - Fix typedInput option selection Fixes #2174
 - Fix palette node id handling so search works Fixes #2173
 - Add popover tooltips to debug sidebar,function and template
 - Add popovers to context sidebar mini buttons
 - Ensure node status icon is shown when value set
 - Revert treeList children function signature change
 - Restore tray component css for compatibility. Mark as deprecated
 - fix function name & string compare function
 - Handle empty list of example flows Fixes #2171
 - Ensure library list has an item selected when opened
 - Ensure tooltip popover doesn't replace normal popover
 - Fix clipboard export download button
 - Ensure input box has focus on repeated quick add
 - Fix width calculation of typedInput
 - Remove some hardcoded css colors
 - Fix display of node help when clicking in palette Fixes #2194
 - Ensure node help is loaded in the right language Fixes #2195
 - Do not allow tab focus on clipboard hidden element
 - Fix undefined error on typedInput due to valueLabel used before being added
 - Fix undo of flow disable state change
 - Fix select-all action in main view
 - Fix delete-all action on config node sidebar
 - Update UI tests for new editor css
 - Add insertItemAt doc to editableList
 - Ensure focus returns to the right element after dialogs shown
 - Set autocomplete to disabled in form input elements
 - Update all node icons to SVG
 - Handle png/svg fallback for def.icon values. Remove old pngs
 - Ignore empty examples directories (don't add to import menu)
 - better handle example file at any depth - #2222
 - Properly escape node types in palette
 - Ensure session expiry timeout doesn't exceed limit
 - Use node/tab map to make filterNodes more efficient
 - Rearrange contents of subflow template settings tab
 - Handle undefined node.\_def in edit stack title.
 - fix converting selection to subflow
 - Fix inserting new subflow node to existing wire between nodes
 - Support displaying falsey node status values Fixes #2246
 - Remove tab menu from node property UI for subflow and config nodes
 - Mark workspace dirty when shift-click-drag detaches wires Fixes #2260
 - Fix subflow category change on palette


Nodes
 - Remove pi gpi, twitter, email and feedparser nodes from core
 - Fix error handling in Websocket broadcast function Fixes #2182
 - Handle websocket item being parseable but not an object better
 - stop join tripping up if last message of buffer is blank.
 - Add support for env var propety in switch node
 - Improve handling of file upload in request node
 - Add "has key" rule to  switch node + tests
 - Optimise generation of switch node edit dialog
 - Add keep-alive option to HTTP Request - #2261

#### 1.0.0-beta.2: Beta Release

Runtime
 - Fix length calculation when loading library file

#### 1.0.0-beta.1: Beta Release

Runtime
 - Update runtime apis to support multiple libraries
 - Add Node 12 to travis (allow_failures)
 - Bump all dependencies Fixes #2152

Editor
 - [BREAKING] complete overhaul of editor DOM/CSS structure
 - [BREAKING] Get rid of Bootstrap
 - Simplify index.mst to a single div to insert the editor
 - Append node configs to div rather than body
 - Only redraw node status when it has changed
 - Minimise work done to calculate node label widths
 - Allow script tags with src to reference esm modules
 - Upgrade to jq 3.4.1 / jq-ui 1.12.1
 - Allow editor language to be chosen in editor settings
 - Only NLS status text that starts with a letter Fixes #2128
 - Fix display of link node list within subflow Fixes #2140
 - Blur the active element when closing edit dialog via action Fixes #2097
 - Trigger change evnt on typedInput when type changes and options present Fixes #2160
 - Move library import/export to single dialog
 - Move type-library dialogs to new style dialog
 - Fix node drag and drop animation
 - let status be simple text if wanted
 - Add workspace statusBar
 - Complete refresh of German translations
 - Fix memory leak in Debug sidebar #2163
 - Introduce toggleButton and move flow-disabled to use it
 - Allow RED.settings.get/set to use full property desc
 - Add auto-refresh toggle to context sidebar
 - Add build-custom-theme script
 - Add RED.view.selectNodes api for node selection whilst editing
 - Add node-select to typedInput

Nodes
 - http request node: warn user if msg.requestTimeout == 0
 - hide delay node reset label on deploy
 - Fix CSV regex to treat strings starting e as text
 - Add "don't parse numbers" option to csv node
 - Add expand editor button to Template node
 - Update catch/status nodes to use selectNodes api and treeList

#### 0.20.8: Maintenance Release

 - Sanitize tab name in edit dialog
 - Pass httpServer to runtime even when httpAdmin disabled Fixes #2272

#### 0.20.7: Maintenance Release

 - Update jsonata to 1.6.5 which should fix #2183
 - Ensure the subflow stop promise is waiting for before restarting
 - Properly escape node types in palette

#### 0.20.6: Maintenance Release

 - Revealing node position needs to account for zoom level Fixes #2172
 - stop join tripping up if last message of buffer is blank.
 - Improve handling of file upload in request node
 - Handle subflow internal node wired to a non-existant node Fixes #2202
 - Do not save subflow env vars with blank names
 - Don't allow a link node virtual wire to connect to normal port
 - Clear HTTP Request node authType when auth disabled Fixes #2215
 - Fix parsing of content-type header Fixes #2216
 - Fix join node reset issue with merging objects
 - Copy data-i18n attribute on TypedInput Fixes #2211

#### 0.20.5: Maintenance Release

 - Revert error handling in palette manager

#### 0.20.4: Maintenance Release

- Switch media-typer to content-type module Fixes #2122 #2123
- Use userObj.username and not .name for ssh key lookup Closes #2109
- Ensure mqtt message handlers are tidied up properly on partial deploy
- Update package dependencies
- Fix encoding menu in file node #2125
- Update ACE to 1.4.3-src-min-noconflict Fixes #2106
- Fix creating missing package.json when existing project imported Fixes #2115
- Allow subflow instance to override env var with falsey values Fixes #2113
- Prevent wire from normal node to link virtual port Fixes #2114
- Add explanation to the help text on the new feature to build query string from msg.payload #2116
- Bump bcrypt to latest
- Add Korean locales files for nodes #2100
- Add error message if catalog is invalid json
- Reduce udp out timeout to be less than default inject at start #2127

#### 0.20.3: Maintenance Release

- Do not dynamically add/remove upgrade listener in ws nodes
- Avoid env var reference loops and support $parent. prefix Fixes #2099
- Ensure config.\_flow is non-enumerable so is ignored by JSON.stringify
- Block loading ACE from cdn

#### 0.20.2: Maintenance Release

 - Filter out duplicate nodes when importing a flow
 - Handle node configs with multiple external scripts properly

#### 0.20.1: Maintenance Release

 - Ensure all subflow instances are stopped when flow stopping Fixes #2095
 - modify name of korean locale forders #2091
 - Ensure node names are sanitized before being presented
 - Subflow status node must pass status to parent flow Fixes #2087
 - fix problem on displaying option label on Firefox #2090

#### 0.20.0: Milestone Release

Runtime
 - Pass complete status to Status node and filter to editor
 - Ensure flows wait for all nodes to close before restarting Fixes #2067
 - Fix git clone with password protected key
 - Allow a project to be located below the root of repo
 - Detect the cloning of an empty git repo properly
 - Fix use of custom auth strategy plugins
 - Remove remnants of when library in git/index Fixes #2057
 - Clear subflow status on close
 - Add exportGlobalContextKeys to prevent exposing functionGlobalContext keys
 - Add --no-audit and --no-update-notifier flags to npm commands to reduce workload
 - Add envVarExcludes setting to block named env vars
 - Update settings.js docs on userDir to match reality Fixes #2082
 - Add Korean Language


Editor
 - Automatic placing of node icon according to input/output counts
 - Transfer placeholder and type to generated TypedInput field
 - Hitting enter in Comment node name field clicks markdown button
 - Shift status text left if no shape specified
 - Better align node status text to status dot
 - Handle treeList labels as text not html
 - Change subflow edit dialog titles
 - Resize subflow edit dialog properly
 - Add flow list button to tab bar
 - Handle node name as unsanitized text in debug sidebar

Nodes

 - HTTP Request: Add Digest and Bearer Auth modes to http request node (#2061)
 - HTTP Request: Add multipart/form-data support to http request node (#2076)
 - TCP: include session/event info in status events
 - WebSocket: include session/event info in status events
 - Add i18n support for port label of inject/exec/httprequest/file nodes
 - Join node: handle merged objects with repeated properties and honour parts
 - JSON node: handle single booleans and numbers
 - File node: add encoding support to file in/out node (#2066)

#### 0.20.0-beta.5: Beta Release

Runtime

 - Bump dependencies
 - Allow `$parent` access of flow context
 - Make Node.\_flow a writeable property
 - Do not propagate Flow.getNode to parent when called from outside flow
 - Add support of subflow env var

Editor

 - Properly sanitize node names in deploy warning dialogs
 - Fix XSS issues in library ui code
 - Add env type to subflow env var types
 - Display parent subflow properties in edit dialog
 - Fix direction value of subflow output
 - Add Status Node to Subflow to allow subflow-specific status Closes #597
 - Better handling of multiple flow merges Fixes #2039

Nodes

 - Various translation updates
 - Catch: Add 'catch uncaught only' mode. Closes #1747
 - Link: scroll to current flow in node list
 - HTTPRequest: add option to urlencode cookies
 - HTTPRequest: option to use msg.payload as query params on GET. #1981
 - Debug: Add local time display option to numerics in debug window
 - MQTT: Add parsed JSON output option

#### 0.20.0-beta.4: Beta Release

Runtime

 - Bump JSONata to 1.6.4
 - Add Flow.getSetting for resolving env-var properties
 - Refactor Subflow logic into own class
 - Restore RED.auth to node-red module api
 - Tidy up when usage in Flow and Node

Editor

 - German translation
 - Change default dropdown appearance and sidebar tab menu handling
 - Handle multiple-select box when nothing selected Fixes #2021
 - Handle i18n properly when key is a valid sub-identifier Fixes #2028
 - Avoid duplicate links when missing node type installed Fixes #2032
 - Add View Tools
 - Don't collapse version control header when clicking refresh
 - Add fast entry via keyboard for string of nodes
 - Check for undeployed change before showing open project dialog
 - Add placeholder node when in quick-add mode
 - Move nodes to top-left corner when converting to subflow

Nodes

 - Debug: Allow debug edit expression to be sent to status
 - WebSocket: Fix missing translated help


#### 0.20.0-beta.3: Beta Release

Editor

 - Update palette manager view properly when module updated
 - Add TreeList common widget
 - Fix visual jump when opening Comment editor on Safari Part of #2008
 - Fix vertical align of markdown editor in Safari Fixes #2008
 - Avoid marking node as changed if label state is default Fixes #2009
 - Highlight port on node hover while joining
 - Support drag-wiring of link nodes
 - Allow TypeSearch to include a filter option
 - Improve diff colouring
 - Allow sections to toggle in 2-element stack
 - Add support for ${} env var syntax when skipping validation Closes #1980
 - i18 support for markdown editor tooltip
 - Add RED.editor.registerTypeEditor for custom type editors
 - Tidy up markdown toolbar handling across all editors
 - Added validation while export into library
 - Reuse notification boxes rather than stack multiple of the same type
 - Make ssh key dialog accessible when opened from new proj dialog

Runtime

 - Bump JSONata to 1.6.4 Fixes #2023
 - Add audit logging to admin api
 - Fix failure of RED.require #2010
 - Allow oauth strategy callback method to be customised Closes #1998
 - Ensure fs context cache is flushed on close Fixes #2001
 - Fix library Buffer( to Buffer.alloc( for node 10
 - Catch file-not-found on startup when non-existant flow file specified
 - Actively expire login sesssions and notify user
 - Add quotation marks for basic auth challenge #1976

Nodes

 - Change: remove promises to improve performance
 - Debug: add ability to apply JSONata expression to message
 - Join: remove promises to improve performance
 - JSON: delete msg.schema before sending msg to avoid conflicts
 - Link: update UI to use common TreeList widget
 - Switch: remove promises to improve performance

#### 0.20.0-beta.2: Beta Release

 - Split Node-RED internals into multiple sub-modules

Editor

 - Allow the editor to use a custom admin api url root
 - Improve performance of Flow Diff dialog - @TothiViseo #1989
 - Add 'open project' option to Projects Welcome dialog
 - Add 'type already registered' check in palette editor
 - Handle missing tab.disabled property
 - Handle missing wires prop and string x/y props on import
 - Add RED.notifications.hide flag - for UI testing
 - Improve alignment of node label edit inputs
 - Show arrow-in node when invalid font-awesome icon name was specified for default icon
 - Add ability to delete context values from sidebar
 - Allow copy-to-clipboard copy whole tabs
 - Make disabled flows more obvious in editor
 - Allow import/export from file in editor
 - Allow config nodes to be selected in sidebar and deleted
 - Show port label of subflow with input port
 - Support ctrl-click selection of flow tabs
 - Allow left-hand node button to act as toggle
 - Support dbl-click in tab bar to add new flow in position
 - Fix duplicate subflow detection on import
 - Add import notification with info on what has been imported Closes #1862
 - Show error details when trying to import invalid json
 - Show default icon when non-existent font-awesome icon was specified
 - Add configurable option for showing node label
 - Avoid http redirects as Safari doesn't reuse Auth header Fixes #1903
 - Tidy up ace tooltip styling
 - Add event log to editor
 - Add tooltips to multiple editor elements
 - Allow palette to be hidden
 - Add node module into to sidebar and palette popover
 - Mark all newly imported nodes as changed
 - Allow a node label to be hidden
 - Add markdown formatting toolbar
 - Add markdown toolbar to various editors
 - Fix i18n handling for ja-JP locale on Safari/MacOS
 - Add node body tooltip
 - Decrease opacity of flow-navigator
 - Update tooltip style
 - Update ACE to 1.4.1-src-min-noconflict
 - Cache node locales by language
 - Show icon element with either icon image or fa-icon
 - Added font-awesome icons to user defined icon
 - Update info side bar with node description section
 - One-click search of config node users
 - Redesign node edit dialog to tabbed style
 - Add 'restart flows' option to deploy menu
 - Add node description property UI


Runtime

 - Allow a project to be loaded from cmdline
 - Handle lookup of undefined property in Global context Fixes #1978
 - Refuse to enable Manage Palette if npm too old
 - Remove restriction on upgrading non-local modules
 - Remove deprecated Buffer constructor usage Fixes #1709
 - Update httpServerOptions doc in settings.js
 - Exclude non-testable .js files from the unit tests
 - Add --safe mode flag to allow starting without flows running
 - Add setting-defined accessToken for automated access to the adminAPI - #1789

Nodes

 - Move all core node EN help to their own locale files - #1990
 - CSV: better regex for number detection
 - Debug: hide button if not configured to send to sidebar
 - Delay: report queue activity when in by-topic mode
 - Delay: add msg.flush mode
 - Exec: Preserve existing properties on msg object
 - File: remove CR/LF from incoming filename
 - Function: create custom ace javascript mode to handle ES6 Fixes #1911
 - Function: add env.get
 - HTTP Request: Add http-proxy config #1913
 - HTTP Request: add msg.redirectList to output
 - HTTP Request: add msg.requestTimeout option for per-message setting - @natcl #1959
 - MQTT: add auto-detect and base64 output to mqtt node Fixes #1912 - @DurandA
 - MQTT: only unsubscribe node that is being removed
 - Sentiment: move to node-red-node-sentiment
 - Switch: add missing edit dialog icon
 - Tail: move to node-red-node-tail
 - TCPGet: clear status if user changes target per message
 - Template: tidy up edit dialog
 - UDP: more resilient binding to correct port for udp, give input side priority
 - Split/Join: add msg.reset to info panel
 - Split/Join: reset join without sending part array
 - Watch: add msg.filename so can feed direct to file in node
 - WebSocket: preserve \_session on msg but don't send as part of wholemsg

#### 0.19.6: Maintenance Release

 - Fix encoding of file node from binary to utf8 - #2051

#### 0.19.5: Maintenance Release

 - Recognize pip installs of RPi.GPIO (#1934)
 - Merge pull request #1941 from node-red-hitachi/master-batch
 - Merge pull request #1931 from node-red-hitachi/master-typedinput
 - Set min value of properties and spinners for batch
 - Fix that unnecessary optionMenu remains
 - Merge pull request #1894 from node-red-hitachi/fix-overlapping-file-node-execution
 - Merge pull request #1924 from imZack/patch-1
 - Add missing comma
 - Do not disable context sidebar during node edit Fixes #1921
 - Don't allow virtual links to be spliced Fixes #1920
 - Merge project package changes to avoid overwritten changes
 - Handle manually added project deps that are unused Fixes #1908
 - update close & input handling of File node
 - make close handler argument only one
 - Merge pull request #1907 from amilajack/patch-2
 - Change repo badge to point to master branch
 - invoke callbacks if async handler is specified
 - Merge pull request #1891 from camlow325/resolve-example-path-for-windows-support
 - Merge pull request #1900 from kazuhitoyokoi/master-addtestcases4settings.js
 - wait closing while pending messages exist
 - Add test cases for red/api/editor/settings.js
 - Ensure all palette categories are opened properly Closes #1893
 - Resolve path when sending example file for Windows support
 - fix multiple input message processing of file node

#### 0.19.4: Maintenance Release

 - Fix race condition in non-cache lfs context Fixes #1888
 - LocalFileSystem Context: Remove extra flush code
 - Prevent race condition in caching mode of lfs context (#1889)
 - Allow context store name to be provided in the key
 - Switch node: only use promises when absolutely necessary
 - Fix dbl-click handling on webkit-based browsers
 - Ensure context.flow/global cannot be deleted or enumerated
 - Handle context.get with multiple levels of unknown key Fixes #1883
 - Fix global.get("foo.bar") for functionGlobalContext set values
 - Fix node color bug (#1877)
 - Merge pull request #1857 from cclauss/patch-1
 - Define raw_input() in Python 3 & fix time.sleep()

#### 0.19.3: Maintenance Release

 - Split node - fix complete to send msg for k/v object
 - Remove unused Join node merged object key typed input
 - Set the JavaScript editor to full-screen
 - Filter global modules installed locally
 - Add svg to permitted icon extension list
 - Debug node - indicate status all the time if selected to do so
 - pi nodes - increase test coverage slightly
 - TCP-request node - only write payload
 - JSON schema: perform validation when obj -> obj or str -> str
 - JSON schema: add draft-06 support (via $schema keyword)
 - Mqtt proxy configuration for websocket connection, #1651.
 - Allows MQTT Shared Subscriptions for MQTT-In core node
 - Fix use of HTML tag or CSS class specification as icon of typedInput

#### 0.19.2: Maintenance Release

 - Ensure node default colour is used if palette.theme has no match
 - fix lost messages / properties in TCPRequest Node; closes #1863 (#1864)
 - Fix typo in template.html
 - Improve error reporting from context plugin loading
 - Prevent no-op edit of node marking as changed due to icon
 - Change node must handle empty rule set

#### 0.19.1: Maintenance Release

 - Pull in latest twitter node
 - Handle windows paths for context storage
 - Handle persisting objects with circular refs in context
 - Ensure js editor can expand to fill available space
 - Add example localfilesystem contextStorage to settings
 - Fix template node handling of nested context tags

#### 0.19: Milestone Release

Editor

 - Add editorTheme.palette.theme to allow overriding colours
 - Index all node properties when searching Fixes #1446
 - Handle NaN and Infinity properly in debug sidebar Fixes #1778 #1779
 - Prevent horizontal scroll when palette name cannot wrap
 - Ignore middle-click on node/ports to enable panning
 - Better wire layout when looping back
 - fix appearence of retry button of remote branch management dialog
 - Handle releasing ctrl when using quick-add node dialog
 - Add $env function to JSONata expressions
 - Widen support for env var to use ${} or $() syntax
 - Add env-var support to TypedInput
 - Show unknown node properties in info tab
 - Add node icon picker widget
 - Only edit nodes on dbl click on primary button with no modifiers
 - Allow subflows to be put in any palette category
 - Add flow navigator widget
 - Cache flow library result to improve response time Fixes #1753
 - Add middle-button-drag to pan the workspace
 - allow multi-line category name in editor
 - Redesign sidebar tabs
 - Do not disable the export-clipboard menu option with empty selection

Nodes

 - Change: Ensure runtime errors in Change node can be caught Fixes #1769
 - File: Add output to File Out node
 - Function: add expandable JavaScript editor pane
 - Function: allow id and name reference in function node code (#1731)
 - HTTP Request: Move to request module
 - HTTP: Ensure apiMaxLength applies to HTTP Nodes Fixes #1278
 - Join: accumulate top level properties
 - Join: allow environment variable as reduce init value
 - JSON: add JSON schema validation via msg.schema
 - Pi: Let nrgpio code work with python 3
 - Pi: let Pi nodes be visible/editable on all platforms
 - Switch: add isEmpty rule
 - TCP: queue messages while connecting; closes #1414
 - TLS: Add servername option to TLS config node for SNI Fixes #1805
 - UDP: Don't accidentally re-use udp port when set to not do so

Persistent Context

 - Add Context data sidebar
 - Add persistable context option
 - Add default memory store
 - Add file-based context store
 - Add async mode to evaluateJSONataExpression
 - Update RED.util.evaluateNodeProperty to support context stores

Runtime

 - Support flow.disabled and .info in /flow API
 - Node errors should be Strings not Errors Fixes #1781
 - Add detection of connection timeout in git communication Fixes #1770
 - Handle loading empty nodesDir
 - Add 'private' property to userDir generated package.json
 - Add RED.require to allow nodes to access other modules
 - Ensure add/remove modules are run sequentially

#### 0.18.7: Maintenance Release

Editor Fixes

 - Do not trim wires if node declares outputs in defaults but misses value Fixes #1737

Node Fixes

 - Relax twitter node version ready for major version bump
 - Pass Date into the Function node sandbox to fix instanceof tests
 - let TCP in node report remote ip and port when in single packet mode
 - typo fix in node help (#1735)

Other Fixes
 - Tidy up default grunt task and fixup test break due to reorder Fixes #1738
 - Bump jsonata version

#### 0.18.6: Maintenance Release

Editor Fixes

 - Handle a node having wires in the editor on ports it no longer has Fixes #1724
 - Add missing ACE snippet files
 - Fix wireClippedNodes is not defined Fixes #1726
 - Split node html to isolate bad nodes when loading
 - Avoid unnecessary use of .html() where .text() will do

 - Add editorTheme.projects.enabled to default settings.js"

#### 0.18.5: Maintenance Release

Projects

 - Add clone project to welcome screen
 - Handle cloning a project without package.json
 - Keep remote branch state in sync between editor and runtime

New Features

 - Add type checks to switch node options (#1714)
 - add output property select to HTML parse node (#1701)
 - Add Prevent Following Redirect to HTTP Request node (#615) (#1684)
 - Add debug and trace functions to function node (#1654)
 - Enable user defined icon for subflow
 - Add MQTT disconnect message and rework broker node UI (#1719)
 - Japanese message catalogue updates (#1723)
 - Show node load errors in the Palette Manager view

Editor Fixes

 - Highlight subflow node when log msg comes from inside Fixes #1698
 - Ensure node wires array is not longer than outputs value Fixes #1678
 - Allow importing an unknown config node to be undone Fixes #1681
 - Ensure keyboard shortcuts get saved in runtime settings Fixes #1696
 - Don't mark a subflow changed when actually modified nothing (#1665)

Node Fixes

 - bind to correct port when doing udp broadcast/multicast (#1686)
 - Provide full error stack in Function node log message (#1700)
 - Fix http request doc type Fixes #1690
 - Make debug slightly larger to pass WCAG AA rating
 - Make core nodes labels more consistent, to close #1673
 - Allow template node to be updated more than once Fixes #1671
 - Fix the problem that output labels of switch node sometimes disappear (#1664)
 - Chinese translations for core nodes (#1607)

Runtime Fixes

 - Handle and display for invalid flow credentials when project is disabled #1689 (#1694)
 - node-red-pi: fix behavior with old bash version (#1713)
 - Fix ENOENT error on first start when no user dir (#1711)
 - Handle null error object in Flow.handleError Fixes #1721
 - update settings comments to describe how to setup for ipv6 (#1675)
 - Remove credential props after diffing flow to prevent future false positives Fixes #1359
 - Log error if settings unavailable when saving user settings Fixes #1645
 - Keep backup of .config.json
 - Add warning if using \_credentialSecret from .config.json
 - Filter req.user in /settings to prevent potentially leaking info

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
 - Introduce `nodeMessageBufferMaxLength` setting for msg sequence nodes
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
