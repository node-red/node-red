#### 3.0.0-beta.3: Beta Release

Editor

 - Add Right-Click content menu (#3678) @knolleary
 - Fix disable junction (#3671) @HiroyasuNishiyama
 - Add Japanese translations for v2.2.3 (#3672) @kazuhitoyokoi
 - Reset mouse state when switching tabs (#3643) @knolleary
 - Fix uncorrect fix of junction to subflow conversion (#3666) @HiroyasuNishiyama
 - Fix undoing junction to subflow (#3653) @HiroyasuNishiyama
 - Fix conversion of junction to subflow (#3652) @HiroyasuNishiyama
 - Fix to include junction to exported nodes (#3650) @HiroyasuNishiyama
 - Fix z-index value for shade to cover nodes in palette (#3649) @kazuhitoyokoi
 - Fix to extend escaped subflow category characters (#3647) @HiroyasuNishiyama
 - Fix to sanitize tab name (#3646) @HiroyasuNishiyama
 - Fix selector placement (#3644) @bonanitech
 - Add Japanese translations for v3.0-beta.2 (#3622) @kazuhitoyokoi
 - Fix new folder menu of save to library dialog (#3633) @HiroyasuNishiyama
 - Fix layer of palette node (#3638) @HiroyasuNishiyama
 - Fix to place a node dragged from palette within the workspace (#3637) @HiroyasuNishiyama
 - Fix typo in CSS (#3628) @bonanitech
 - Use the correct variable for the gutter text color (#3615) @bonanitech


Runtime

 - Support loading node modules from `nodesdir` (#3676) @Steve-Mcl
 - fix buffer parse error message of evaluateNodeProperty (#3624) @HiroyasuNishiyama

Nodes

 - File: Further simplify file node filename entry UX (v3) (#3677) @Steve-Mcl
 - Function: Fix initial cursor position of init/finalize tab of function node (#3674) @HiroyasuNishiyama
 - Function: Fix ESM module loading in Function node (#3645) @knolleary
 - Inject: Fix JSONata evaluation of inject button (#3632) @HiroyasuNishiyama
 - TCP: Dont delete TCP socket twice (#3630) @Steve-Mcl
 - MQTT Node: define noproxy variable (#3626) @Steve-Mcl
 - Debug: i18n debug sidebar node label (#3623) @HiroyasuNishiyama

#### 3.0.0-beta.2: Beta Release

**Migration from 2.x**

 - The 'slice wires' action has changed from Ctrl-RightMouseButton to Alt-LeftMouseButton

Editor

 - Rework Junctions to be more node like in their event handling (#3607) @knolleary
 - Change slicing / slice-junction operations over to mouse button 0 (Left Mouse Button) (#3609) @Steve-Mcl
 - Do not slice-junction link node wires (#3608) @knolleary
 - Handle many-to-one slicing of wires (#3604) @knolleary
 - Ensure ACE worker options are set (#3611) @Steve-Mcl
 - Remove duplicate history add of ungroup event (#3605) @knolleary
 - use text width instead of number of characters for deciding select fi… (#3603) @HiroyasuNishiyama
 - Update Japanese info of link call node reflecting update of English info (#3600) @HiroyasuNishiyama
 - Fix typedInput label not visible on themes (#3580) @bonanitech
 - Fix project switching when junctions are present (#3595) @Steve-Mcl
 - Fix junction: when wiring from a regular nodes INPUT, backwards to a junction (#3591) @Steve-Mcl
 - Fix error initialising flow tab editor (#3585) @Steve-Mcl
 - Add Japanese translations for v3.0-beta.1 (#3576) @kazuhitoyokoi
 - Fix image paths where `red/image/typedInput/XXXX.png` should be `red/image/typedInput/XXXX.svg` (#3592) @kazuhitoyokoi
 - Fix browser console error Uncaught TypeError when searching certain terms (#3584) @Steve-Mcl

Runtime

 - fix error on system-info action (#3589) @HiroyasuNishiyama

Nodes

 - I18n switch rule selector (#3602) @HiroyasuNishiyama
 - Handle removal of event handlers to allow mqtt client.end() to work (#3594) @PhilDay-CT
 - update link-call node info according to current behavior (#3597) @HiroyasuNishiyama


#### 3.0.0-beta.1: Beta Release

**Migration from 2.x**

 - Node-RED now requires Node.js 14.x or later.
 - New installs of Node-RED will default to the monaco editor.


Editor

 - Add Junctions (#3462) @knolleary
 - Allow node name to be auto-generated when added (#3478, #3538) @knolleary
 - Set monaco as default code editor as of v3.x (#3543) @Steve-Mcl
 - Update Monaco to V0.33.0 (#3522) @Steve-Mcl
 - Auto-complete Improvements (#3521) @Steve-Mcl
 - Add a tooltip to debug sidebar messages to reveal full path to node (#3503) @knolleary
 - Fix down arrow triggering menu in search box (#3507) @Steve-Mcl
 - Add Japanese translations for v3.0 (#3512) @kazuhitoyokoi
 - Add feature: Continuous search tools (search previous, search next) (#3405) @Steve-Mcl
 - Add feature: split-wire-to-links (#3399, #3476) @Steve-Mcl
 - Add copy button to node properties tables (#3390) @knolleary
 - Add info-tab search options dropdown to the regular search (#3395) @Steve-Mcl
 - New Feature: Add ability to find modified nodes/flows. (#3392) @Steve-Mcl
 - Code editor ux improvements around remembering state of each code editor in a flow (#3553) @Steve-Mcl
 - Make it easier to apply themes on SVG icons (#3515) @bonanitech
 - Add support of property validation message (#3438) @HiroyasuNishiyama
 - Ensure node validation tooltip is closed when field becomes valid (#3570) @knolleary
 - Add "search for" buttons to notifications (#3567) @Steve-Mcl
 - Don't let themes change node config colors (#3564) @bonanitech
 - Fix gap between typedInput containers borders (#3560) @bonanitech
 - Fix recording removed links in edit history (#3547) @knolleary
 - Remove unused SASS vars (#3536) @bonanitech
 - Add custom style for jQuery widgets borders (#3537) @bonanitech
 - fix out of scope reference of hasUnusedConfig variable (#3535) @HiroyasuNishiyama
 - correct "non string" check parenthesis (#3524) @Steve-Mcl
 - Ensure i18n of scoped package name (#3516) @Steve-Mcl
 - Prevent shortcut deploy when deploy button shaded (#3517) @Steve-Mcl
 - Fix: Sidebar "Configuration" filter button tooltip (#3500) @ralphwetzel
 - Add the ability to customize diff colors even more (#3499) @bonanitech
 - Do JSON comparison of old value/new value in editor (#3481) @Steve-Mcl
 - Fix nodes losing their wires when in an iframe (#3484) @zettca
 - Improve scroll into view (#3468) @Steve-Mcl
 - Do not show 1st tab if hidden when loading (#3464) @Steve-Mcl

Runtime

 - Fix importing external module from node-red module (#3541) @knolleary
 - Add support for multiple static paths with optional static root (#3542) @Steve-Mcl
 - Store external token when authenticating if provided (#3460) @ArFe
 - Support OAuth/OpenID logout (#3388) @mw75
 - Allow adminAuth to auto-login users when using passport strategy (#3519) @knolleary
 - Add runtime diagnostics admin endpoint (#3511) @Steve-Mcl
 - Don't start if user has no home directory (#3540) @hardillb
 - Error on invalid encrypted credentials (#3498) @sammachin

Nodes

 - Debug: Add message count option to Debug status (#3544 #3551) @rafaelmuynarsk @knolleary
 - File: Change basic Filename field to a typedInput (#3533) @Steve-Mcl
 - HTTP Request: Add UI for Http Request node headers (#3488) @Steve-Mcl
 - Inject: let inject optionally fire at start in only at time mode. (#3385) @dceejay
 - Link Call: Dynamic link call (#3463) @Steve-Mcl
 - Link Call: Display link targets of nodes in a regular flow, for Link Call nodes inside a subflow (#3528) @Steve-Mcl
 - MQTT: MQTT payload auto parsing improvements (#3530) @Steve-Mcl
 - MQTT: Add client and Runtime MQTT topic validation (#3563) @Steve-Mcl [dev]
 - MQTT: save and restore v5 config user props (#3562) @Steve-Mcl
 - MQTT: Fix incorrect MQTT status (#3552) @Steve-Mcl
 - MQTT: fix reference error of msg.status in debug node (#3526) @HiroyasuNishiyama
 - MQTT: Add unit tests for MQTT nodes (#3497) @Steve-Mcl
 - MQTT: fix typo of will properties (#3502) @Steve-Mcl
 - MQTT: ensure mqtt v5 props can be set false (#3472) @Steve-Mcl
 - Switch: add check for NaN in is of type number to be false (#3409) @dceejay
 - TCP: TCP node better split (#3465) @dceejay
 - Watch: Update Watch node to use node-watch module (#3559 #3569) @knolleary
 - WebSocket: call done after ws disconnects (#3531) @Steve-Mcl


#### 2.2.2: Maintenance Release

Nodes

 - Fix "close timed out" error when performing full deploy or modifying broker node. (#3451) @Steve-Mcl


#### 2.2.1: Maintenance Release

Editor

 - Handle mixed-cased filter terms in keyboard shortcut dialog (#3444) @knolleary
 - Prevent duplicate links being added between nodes (#3442) @knolleary
 - Fix to hide tooltip after removing subflow tab (#3391) @HiroyasuNishiyama
 - Fix node validation to be applied to config node (#3397) @HiroyasuNishiyama
 - Fix: Dont add wires to undo buffer twice (#3437) @Steve-Mcl

Runtime

 - Improve module location parsing (of stack info) when adding hook (#3447) @Steve-Mcl
 - Fix substitution of NR_NODE_PATH (#3445) @HiroyasuNishiyama
 - Remove console.log when ignoring disabled module (#3439) @knolleary
 - Improve "Unexpected Node Error" logging (#3446) @Steve-Mcl

Nodes

 - Debug: Fix no-prototype-builtins bug in debug node and utils (#3394) @Alkarex
 - Delay: Fix Japanese message of delay node (#3434)
 - Allow nbRateUnits to be undefined when validating (#3443) @knolleary
 - Coding help for recently added node-red Predefined Environment Variables (#3440) @Steve-Mcl


#### 2.2.0: Milestone Release

Editor

 - Add editorTheme.tours property to default settings file (#3375) @knolleary
 - Remember Zoom level and Sidebar tab selection between sessions (#3361) @knolleary
 - Fix timing issue when merging background changes fixes #3364 (#3373) @Steve-Mcl
 - Use a nodes palette label in help tree (#3372) @Steve-Mcl
 - Subflow: Add labels to OUTPUT nodes (#3352) @ralphwetzel
 - Fix vertical align subflow port (#3370) @knolleary
 - Make actions list i18n ready and Japanese translation (#3359) @HiroyasuNishiyama
 - Update tour for 2.2.0 (#3378) @knolleary
 - Include paletteLabel when building search index (#3380) @Steve-Mcl
 - Fix opening/closing subflow template not to make subflow changed (#3382) @HiroyasuNishiyama
 - Add Japanese translations for v2.2.0 (#3353, #3381) @kazuhitoyokoi

Runtime

 - Add support for accessing node id & name as environment variable (#3356) @HiroyasuNishiyama
 - Clear context contents when switching projects (#3243) @knolleary

Nodes

 - MQTT: reject invalid topics (#3374) @Steve-Mcl
 - Function: Expose node.path property (#3371) @knolleary
 - Function: Update `node` declarations in func.d.ts (#3377) @Steve-Mcl

#### 2.2.0-beta.1: Beta Release

Editor

 - Add search history to main search box (#3262) @knolleary
 - Check availability of type of config node on deploy (#3304) @k-toumura
 - Add wire-slice mode to delete wires with Ctrl-RHClick-Drag (#3340) @knolleary
 - Wiring keyboard shortcuts (#3288) @knolleary
 - Snap nodes on grid using either edge as reference (#3289) @knolleary
 - Detach node action (#3338) @knolleary
 - Highlight links when selecting nodes (#3323) @knolleary
 - Allow multiple links to be selected by ctrl-click (#3294) @knolleary

Nodes

 - JSON: Let JSON node attempt to parse buffer if it contains a valid string (#3296) @dceejay
 - Remove use of verbose flag in core nodes - and use node.debug level instead (#3300) @dceejay
 - TCP: Add TLS option to tcp client nodes (#3307) @dceejay
 - WebSocket: Implemented support for Websocket Subprotocols in WS Client Node. (#3333) @tobiasoort

#### 2.1.6: Maintenance Release

Editor

 - Revert copy-text change and apply alternative fix (#3363) @knolleary
 - Update marked to latest (#3362) @knolleary
 - fix to make start of property error tooltip messages aligned (#3358) @HiroyasuNishiyama

Nodes

 - Inject: fix JSON propety validation of inject node (#3349) @HiroyasuNishiyama
 - Delay: fix unit value validation of delay node (#3351) @HiroyasuNishiyama

#### 2.1.5: Maintenance Release

Runtime

 - Handle reporting error location when stack is truncated (#3346) @knolleary
 - Initialize passport when only adminAuth.tokens is set (#3343) @knolleary
 - Add log logging (#3342) @knolleary

Editor

 - Fix copy buttons on the debug window (another method) (#3331) @kazuhitoyokoi
 - Add Japanese translations for hidden flow (#3302) @kazuhitoyokoi
 - Improve jsonata legacy mode detection regex (#3345) @knolleary
 - Fix generating flow name with incrementing number (#3347) @knolleary
 - resume focus after import/export dialog close (#3337) @HiroyasuNishiyama
 - Fix findPreviousVisibleTab action (#3321) @knolleary
 - Fix storing hidden tab state when not hidden via action (#3312) @knolleary
 - Avoid adding empty env properties to tabs/groups (#3311) @knolleary
 - Fix hide icon in tour guide (#3301) @kazuhitoyokoi

Nodes

 - File: Update file node examples according to node name change (#3335) @HiroyasuNishiyama
 - Filter (RBE): Fix for filter node narrrowbandEq mode start condition failure (#3339) @dceejay
 - Function: Prevent function scrollbar from obscuring expand button (#3348) @knolleary
 - Function: load extralibs when expanding monaco. fixes #3319 (#3334) @Steve-Mcl
 - Function: Update Function to use correct api to access env vars (#3310) @knolleary
 - HTTP Request: Fix basic auth with empty username or password (#3325) @hardillb
 - Inject: Fix incorrect clearing of blank payload property in Inject node (#3322) @knolleary
 - Link Call: add link call example (#3336) @HiroyasuNishiyama
 - WebSocket: Only setup ws client heartbeat once it is connected (#3344) @knolleary
 - Update Japanese translations in node help (#3332) @kazuhitoyokoi

#### 2.1.4: Maintenance Release

Runtime

 - fix env var access using $parent for groups (#3278) @HiroyasuNishiyama
 - Add proper error handling for 404 errors when serving debug files (#3277) @knolleary
 - Add Japanese translations for Node-RED v2.1.0-beta.1 (#3179) @kazuhitoyokoi
 - Include full user object on login audit events (#3269) @knolleary
 - Remove styling from de locale files (#3237) @knolleary

Editor

 - Change tab hide button icon to an eye and add search option (#3282) @knolleary
 - Fix i18n handling of namespaces with spaces in (#3281) @knolleary
 - Trigger change event when autoComplete fills in input (#3280) @knolleary
 - Apply CN i18n fix (#3279) @knolleary
 - fix select menu label of config node to use paletteLabel (#3273) @HiroyasuNishiyama
 - fix removed tab not to cause node conflict (#3275) @HiroyasuNishiyama
 - Group diff fix (#3239) @knolleary
 - Only toggle disabled workspace flag if on activeWorkspace (#3252) @knolleary
 - Do not show status for disabled nodes (#3253) @knolleary
 - Set dimension value for tour guide (#3265) @kazuhitoyokoi
 - Avoid redundant initialisation of TypedInput type (#3263) @knolleary
 - Don't let themes change flow port label color (#3270) @bonanitech
 - Fix treeList gutter calculation to handle floating gutters (#3238) @knolleary

Nodes

- Debug: Handle RegExp types in Debug sidebar (#3251) @knolleary
- Delay: fix 2nd output when in rate limit per topic modes (#3261) @dceejay
- Link: fix to show link target when selected (#3267) @HiroyasuNishiyama
- Inject: Do not modify inject node props in oneditprepare (#3242) @knolleary
- HTTP Request: HTTP Basic Auth should always add : between username and password even if empty (#3236) @hardillb

#### 2.1.3: Maintenance Release

Runtime

 - Update gen-publish script to update 'next' tag for main releases
 - Add environment variable to enable/disable tours (#3221) @hardillb
 - Fix loading non-default language files leaving runtime in wrong locale (#3225) @knolleary

Editor

 - Refresh editor settings whenever a node is added or enabled (#3227) @knolleary
 - Revert spinner css change that made it shrink in some cases (#3229) @knolleary
 - Fix import notification message when importing config nodes (#3224) @knolleary
 - Handle changing types of TypedInput repeatedly (#3223) @knolleary


#### 2.1.2: Maintenance Release


Runtime

 - node-red-pi: Remove bash dependency (#3216) @a16bitsysop

Editor

 - Improved regex for markdown renderer (#3213) @GerwinvBeek
 - Fix TypedInput initialisation (#3220) @knolleary

Nodes

 - MQTT: fix datatype in node config not used. fixes #3215 (#3219) @Steve-Mcl

#### 2.1.1: Maintenance Release

Editor

 - Ensure tourGuide popover doesn't fall offscreen (#3212) @knolleary
 - Fix issue with old inject nodes that migrated topic to 'string' type (#3210) @knolleary
 - Add cache-busting query params to index.mst (#3211) @knolleary
 - Fix TypedInput validation of type without options (#3207) @knolleary

#### 2.1.0: Milestone Release

Editor

 - Position popover properly on a scrolled page
 - Fixes from 2.1.0-beta.2 (#3202) @knolleary

Nodes

- Link Out: Fix saving link out node links (#3201) @knolleary
 - Switch: Refix #3170 - copy switch rule type when adding new rule
 - TCP Request: Add string option to TCP request node output (#3204) @dceejay

#### 2.1.0-beta.2: Beta Release

Editor

 - Fix switching projects (#3199) @knolleary
 - Use locale setting when installing/enabling node (#3198) @knolleary
 - Do not show projects-wecome dialog until welcome tour completes (#3197) @knolleary
 - Fix converting selection to subflow (#3196) @knolleary
 - Avoid conflicts with native browser cmd-ctrl type shortcuts (#3195) @knolleary
 - Ensure message tools stay attached to top-level entry in Debug/Context (#3186) @knolleary
 - Ensure tab state updates properly when toggling enable state (#3175) @knolleary
 - Improve handling of long labels in TreeList (#3176) @knolleary
 - Shift-click tab scroll arrows to jump to start/end (#3177) @knolleary

Runtime

 - Update package dependencies
 - Update to latest node-red-admin

Nodes

 - Dynamic MQTT connections (#3189)
 - Link: Filter out Link Out Return nodes in Link In edit dialog Fixes #3187
 - Link: Fix link call label (#3200) @knolleary
 - Debug: Redesign debug filter options and make them persistant (#3183) @knolleary
 - Inject: Widen Inject interval box for >1 digit (#3184) @knolleary
 - Switch: Fix rule focus when switch 'otherwise' rule is used (#3185) @knolleary

#### 2.1.0-beta.1: Beta Release

Editor

 - Add Tour Guide component (#3136) @knolleary
 - Allow tabs to be hidden (#3120) @knolleary
 - Add align actions to editor (#3110) @knolleary
 - Add support of environment variable for tab & group (#3112) @HiroyasuNishiyama
 - Add autoComplete widget and add to TypedInput for msg. props (#3171) @knolleary
 - Render node documentation to node-red style guide when written in markdown. (#3169) @Steve-Mcl
 - Allow colouring of tab icon svg (#3140) @harmonic7
 - Restore tab selection after merging conflicts (#3151) @GerwinvBeek
 - Fix serving of theme files on Windows (#3154) @knolleary
 - Ensure config-node select inherits width properly from input (#3155) @knolleary
 - Do better remembering TypedInput values whilst switching types (#3159) @knolleary
 - Update monaco to 0.28.1 (#3153) @knolleary
 - Improve themeing of tourGuide (#3161) @knolleary
 - Allow a node to specify a filter for the config nodes it can pick from (#3160) @knolleary
 - Allow RED.notify.update to modify any notification setting (#3163) @knolleary
 - Fix typo in ko editor.json Fixes #3119
 - Improve RED.actions api to ensure actions cannot be overridden
 - Ensure treeList row has suitable min-height when no content Fixes #3109
 - Refactor edit dialogs to use separate edit panes
 - Ensure type select button is not focussable when TypedInput only has one type
 - Place close tab link in front of fade

Runtime

 - Improve error reporting with oauth login strategies (#3148) @knolleary
 - Add allowUpdate feature to externalModules.palette (#3143) @knolleary
 - Improve node install error reporting (#3158) @knolleary
 - Improve unit test coverage (#3168) @knolleary
 - Allow coreNodesDir to be set to false (#3149) @hardillb
 - Update package dependencies
 - uncaughtException debug improvements (#3146) @renatojuniorrs

Nodes

 - Change: Add option to deep-clone properties in Change node (#3156) @knolleary
 - Delay: Add push to front of rate limit queue. (#3069) @dceejay
 - File: Add paletteLabel to file nodes to make read/write more obvious (#3157) @knolleary
 - HTTP Request: Extend HTTP request node to log detailed timing information (#3116) @k-toumura
 - HTTP Response: Fix sizing of HTTP Response header fields (#3164) @knolleary
 - Join: Support for msg.restartTimeout (#3121) @magma1447
 - Link Call: Add Link Call node (#3152) @knolleary
 - Switch: Copy previous rule type when adding rule to switch node (#3170) @knolleary
 - Delay node: add option to send intermediate messages on separate output (#3166) @knolleary
 - Typo in http request set method translation (#3173) @mailsvb

#### 2.0.6: Maintenance Release

Editor

 - Fix typo in ko editor.json Fixes #3119
 - Change fade color when hovering an inactive tab (#3106) @bonanitech
 - Ensure treeList row has suitable min-height when no content Fixes #3109

Runtime

 - Update tar to latest (#3128) @aksswami
 - Give passport verify callback the same arity as the original callback (#3117) @dschmidt
 - Handle HTTPS Key and certificate as string or buffer (#3115) @bartbutenaers

#### 2.0.5: Maintenance Release

Editor

 - Remove default ctrl-enter keybinding from monaco editor Fixes #3093

Runtime

 - Update tar dependency
 - Add support for maintenance streams in generate-publish-script


Nodes

 - Fix regression in Join node when manual joining array with msg.parts present Fixes #3096

#### 2.0.4: Maintenance Release

Editor

 - Fix tab fade CSS for when using themes (#3085) @bonanitech
 - Handle just-copied-but-not-deployed node with credentials in editor Fixes #3090

Nodes

 - Filter: Fix RBE node handling of default topi property Fixes #3087
 - HTTP Request: Handle partially encoded url query strings in request node
 - HTTP Request: Fix support for supplied CA certs (#3089) @hardillb
 - HTTP Request: Ensure TLS Cert is used (#3092) @hardillb
 - Inject: Fix inject now button unable to send empty props
 - Inject: Inject now button success notification should use label with updated props

#### 2.0.3: Maintenance Release

Nodes

 - HTML: Fix HTML parsing when body is included in the select tag Fixes #3079
 - HTTP Request: Preserve case of user-provided http headers in request node Fixes #3081
 - HTTP Request: Set decompress to false for HTTP Request to keep 1.x compatibility Fixes #3083
 - HTTP Request: Add unit tests for HTTP Request encodeURI and error response
 - HTTP Request: Do not throw HTTP errors in request node Fixes #3082
 - HTTP Request: Ensure uri is properly encoded before passing to got module Fixes #3080

#### 2.0.2: Maintenance Release

Runtime

 - Use file:// url with dynamic import
 - Detect if agent-base has patched https.request and undo it Fixes #3072

Editor

 - Fix tab fade css because Safari Fixes #3073
 - Fix error closing library dialog with monaco
 - Handle other error types in Manage Palette view


Nodes

 - HTTP Request node - ignore invalid cookies rather than fail request Fixes #3075
 - Fix msg.reset handling in Delay node Fixes #3074

#### 2.0.1: Maintenance Release

Nodes

 - Function: Ensure default module export is exposed in Function node

#### 2.0.0: Milestone Release

**Migration from 1.x**

 - Node-RED now requires Node.js 12.x or later.

 - The following nodes have had significant dependency updates. Unless stated,
   they should be fully backward compatible.

   - RBE:  Relabelled as 'filter' to make it more discoverable and made part of
     the core palette, rather than as a separate module.
   - Tail: This node has been removed from the default palette. You can reinstall it
     from node-red-node-tail
   - HTTP Request: Reimplemented with a different underlying module. We have
     tried to maintain 100% functional compatibility, but it is possible
     some edge cases remain.
   - JSON: The schema validation option no longer supports JSON-Schema draft-04
   - HTML: Its underlying module has had a major version update. Should be fully
     backward compatible.

 - `functionExternalModules` is now enabled by default for new installs.
   If you have an existing settings file that contains this setting, you will
   need to set it to `true` yourself.

   The external modules will now get installed in your Node-RED user directory,
   (`~/.node-red`) rather than in a subdirectory. This means all dependencies will
   be listed in your top-level `package.json`. If you have existing external modules,
   they will get reinstalled to the new location when you first run Node-RED 2.0.


Runtime

 - Fix missing dependencies (#3052, #2057) @kazuhitoyokoi
 - Ensure node.types is defined if node html file missing
 - Fix reporting of type_already_registered error
 - Move install location of external modules (#3064) @knolleary

Editor

 - Update translations (#3063) @kazuhitoyokoi
 - Add a slight fade to tab labels that overflow
 - Show config node details when selected in outliner
 - Fix layout of info outliner for subflow entries

Nodes

 - Delay: let `msg.flush` specify how many messages to flush from node (#3059) @dceejay
 - Function: external modules is now enabled by default (#3065) @knolleary
 - Function: external modules now supports both ES6 and CJS modules (#3065) @knolleary
 - WebSocket: add option for client node to send automatic pings (#3056) @knolleary


##### 2.0.0-beta.2: Beta Release

Runtime

 - Add `node-red admin init` (via `node-red-admin@2.1.0`)
 - Move to GH Actions rather than Travis for build (#3042) @knolleary

Editor

 - Include hasUser=false config nodes when exporting whole flow (#3048)
 - Emit nodes:change for any updated config node when node deleted/added
 - Fix padding of compact notification Closes #3045
 - Ensure any html in changelog is escaped before displaying
 - Add support for Map/Set property types on Debug (#3040) @knolleary
 - Add 'theme' to default settings file
 - Add RED.view.annotations api (#3032) @knolleary
 - Update monaco editor to V0.25.2 (#3031) @Steve-Mcl
 - Lower tray zIndex when overlay tray being opened Fixes #3019
 - Reduce z-Index of Function expand buttons to prevent overlap Part of #3019
 - Ensure RED.clipboard.import displays the right library Fixes #3021
 - Batch messages sent over comms to prevent flooding (#3025) @knolleary
 - Allow RED.popover.panel to specify a closeButton to ignore click events on
 - Use browser default language for initial page load
 - Add css var for node font color
 - Fix label padding of toggleButton
 - Give sidebar open tab a bit more room for its label
 - Various Monaco updates (#3015) @Steve-Mcl
 - Log readOnly on startup (#3024) @sammachin
 - Translation updates (#3020 #3022) @HiroyasuNishiyama @kazuhitoyokoi

Nodes

 - HTTP Request: Fix proxy handling (#3044) @hardillb
 - HTTP Request: Handle basic auth with @ in username (#3017) @hardillb
 - Add Japanese translation for file-in node (#3037 #3039) @kazuhitoyokoi
 - File In: Add option for file-in node to include all properties (default off) (#3035) @dceejay
 - Exec: add windowsHide option to hide windows under Windows (#3026) @natcl
 - Support loading external module sub path Fixes #3023

##### 2.0.0-beta.1: Beta Release



Runtime

 - [MAJOR] Set minimum node version to 12.
 - [MAJOR] Fix flowfile name to flows.json in settings (#2951) @dceejay
 - [MAJOR] Update to latest i18n in editor and runtime (#2940) @knolleary
 - [MAJOR] Deprecate usage of httpRoot (#2953) @knolleary
 - Add pre/postInstall hooks to npm install handling (#2936) @knolleary
 - Add engine-strict flag to npm install args (#2965) @nileio
 - Restructure default settings.js to be more organised (#3012) @knolleary
 - Ensure httpServerOptions gets applied to ALL the express apps
 - Allow RED.settings.set to replace string property with object property
 - Update debug tests to handle compact comms format
 - Updates to encode/decode message when passed over debug comms link
 - Remove all input event listeners on a node once it is closed
 - Move hooks to util package
 - Rework hooks structure to be a linkedlist
 - Update dependencies (#2922) @knolleary

Editor

 - [MAJOR] Change node id generation to give fixed length values without '.' (#2987) @knolleary
 - [MAJOR] Add Monaco code editor (#2971) @Steve-Mcl
 - Update to latest Monaco (#3007) @Steve-Mcl
 - Update Node-RED Function typings in Monaco (#3008) @Steve-Mcl
 - Add css named variables for certain key colours (#2994) @knolleary
 - Improve contrast of export dialog JSON font color
 - Switch editableList buttons from <a> to <button> elements
 - Add option to RED.nodes.createCompleteNodeSet to include node dimensions
 - Fix css of node help table of contents elements
 - Improve red-ui-node-icon css and add red-ui-node-icon-small modifier class
 - Add RED.hooks to editor
 - Add viewAddPort viewRemovePort viewAddNode viewRemoveNode hooks to view
 - Use paletteLabel if set in help sidebar
 - Add missing args from JSONata $now signature

Nodes

 - [MAJOR] Relabel RBE node as 'filter' and move into core. Also remove tail (#2944) @dceejay
 - [MAJOR] HTTP Request: migrate to 'got' module (#2952) @knolleary
 - [MAJOR] Move Inject node to CronosJS module (#2959) @knolleary
 - [MAJOR] JSON: Update ajv to 8.2.0 - drop support for JSON-Schema draft-04 (#2969) @knolleary
 - [MAJOR] HTML node: cheerio update to 1.x (#3011) @knolleary
 - Join: change default manual mode to object (#2931) @knolleary
 - File node: Add fileWorkingDirectory (#2932) @knolleary
 - Delay node enhancements (#2294) @kazuhitoyokoi (#2949) @dceejay
 - Add Japanese translations for delay node enhancements (#2958) @kazuhitoyokoi
 - Inject node: reorder TypedInput options (#2961) @dceejay
 - HTTP Request: update to work with proxies (#2983) @hardillb (#3009) @hardillb
 - HTTP Request: fix msg.responseUrl (#2986) @hardillb
 - TLS: Add ALPN support to TLS node (#2988) @hardillb
 - Inject: add "Inject now" button to edit dialog (#2990) @Steve-Mcl



#### Older Releases

Change logs for older releases are available on GitHub: https://github.com/node-red/node-red/releases
