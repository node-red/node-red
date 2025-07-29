#### 4.0.9: Maintenance Release

 Editor
 
 - Add details for the dynamic subscription to match the English docs (#5050) @aikitori
 - Fix tooltip snapping based on `typedInput` type (#5051) @GogoVega
 - Prevent symbol usage warning in monaco (#5049) @Steve-Mcl
 - Show subflow flow context under node section of sidebar (#5025) @knolleary
 - feat: Add custom label for default deploy button in settings.editorTheme (#5030) @matiseni51
 - Handle long auto-complete suggests (#5042) @knolleary
 - Handle undefined username when generating user icon (#5043) @knolleary
 - Handle dragging node into group and splicing link at same time (#5027) @knolleary
 - Remember context sidebar tree state when refreshing (#5021) @knolleary
 - Update sf instance env vars when removed from template (#5023) @knolleary
 - Do not select group when triggering quick-add within it (#5022) @knolleary
 - Fix library icon handling within library browser component (#5017) @knolleary
 
Runtime
 - Allow env var access to context (#5016) @knolleary
 - fix debug status reporting if null (#5018) @dceejay
 - Fix grunt dev via better ndoemon ignore rules (#5015) @knolleary
 - Fix typo in CHANGELOG (4.0.7-->4.0.8) (#5007) @natcl

Nodes
 - Switch: Avoid exceeding call stack when draining message group in Switch (#5014) @knolleary

#### 4.0.8: Maintenance Release

Editor

 - Fix config node sort order when importing (#5000) @knolleary

#### 4.0.7: Maintenance Release

Editor

 - Fix def can be undefined if the type is missing (#4997) @GogoVega
 - Fix the user list of nested config node (#4995) @GogoVega
 - Support custom login message and button (#4993) @knolleary

#### 4.0.6: Maintenance Release

Editor

 - Roll up various fixes on config node change history (#4975) @knolleary
 - Add quotes when installing local tgz to fix spacing in the file path (#4949) @AGhorab-upland
 - Validate json dropped into editor to avoid unhelpful error messages (#4964) @knolleary
 - Fix junction insert position via context menu (#4974) @knolleary
 - Apply zoom scale when calculating annotation positions (#4981) @knolleary
 - Handle the import of an incomplete Subflow (#4811) @GogoVega
 - Fix updating the Subflow name during a copy (#4809) @GogoVega
 - Rename variable to avoid confusion in view.js (#4963) @knolleary
 - Change groups.length to groups.size (#4959) @hungtcs
 - Remove disabled node types from QuickAddDialog list (#4946) @GogoVega
 - Fix `setModulePendingUpdated` with plugins (#4939) @GogoVega
 - Missing getSubscriptions in the docs while its implemented (#4934) @ersinpw
 - Apply `envVarExcludes` setting to `util.getSetting` into the function node (#4925) @GogoVega
 - Fix `envVar` editable list should be sortable (#4932) @GogoVega
 - Improve the node name auto-generated with the first available number (#4912) @GogoVega

Runtime

 - Get the env config node from the parent subflow (#4960) @GogoVega
 - Update dependencies (#4987) @knolleary

Nodes

 - Performance : make reading single buffer / string file faster by not re-allocating and handling huge buffers (#4980) @Fadoli
 - Make delay node rate limit reset consistent - not send on reset. (#4940) @dceejay
 - Fix trigger node date handling for latest time type input (#4915) @dceejay
 - Fix delay node not dropping when nodeMessageBufferMaxLength is set (#4973)
 - Ensure node.sep is honoured when generating CSV (#4982) @knolleary

#### 4.0.5: Maintenance Release

Editor

 - Refix link call node can call out of a subflow (#4908) @GogoVega

#### 4.0.4: Maintenance Release

Editor

 - Fix `link call` node can call out of a subflow (#4892) @GogoVega
 - Fix wrong unlock state when event is triggered after deployment (#4889) @GogoVega
 - i18n(App) update with latest language file changes (#4903) @joebordes
 - fix typo: depreciated (#4895) @dxdc

Runtime

 - Update dev dependencies (#4893) @knolleary

Nodes
 
 - MQTT: Allow msg.userProperties to have number values (#4900) @hardillb

#### 4.0.3: Maintenance Release

Editor

 - Refresh page title after changing tab name (#4850) @kazuhitoyokoi
 - Add Japanese translations for v4.0.2 (again) (#4853) @kazuhitoyokoi
 - Stay in quick-add mode following context menu insert (#4883) @knolleary
 - Do not include Junction type in quick-add for virtual links (#4879) @knolleary
 - Multiplayer cursor tracking (#4845) @knolleary
 - Hide add-flow options when disabled via editorTheme (#4869) @knolleary
 - Fix env-var config select when multiple defined (#4872) @knolleary
 - Fix subflow outbound-link filter (#4857) @GogoVega
 - Add French translations for v4.0.2 (#4856) @GogoVega
 - Fix moving link wires (#4851) @knolleary
 - Adjust type search dialog position to prevent x-overflow (#4844) @Steve-Mcl
 - fix: modulesInUse might be undefined (#4838) @lorenz-maurer
 - Add Japanese translations for v4.0.2 (#4849) @kazuhitoyokoi
 - Fix menu to enable/disable selection when it's a group (#4828) @GogoVega

Runtime

 - Update dependencies (#4874) @knolleary
 - GitHub: Add citation file to enable "Cite this repository" feature (#4861) @lobis
 - Remove use of util.log (#4875) @knolleary

Nodes

 - Fix invalid property error in range node example (#4855)
 - Fix typo in flow example name (#4854) @kazuhitoyokoi
 - Move SNI, ALPN and Verify Server cert out of check (#4882) @hardillb
 - Set status of mqtt nodes to "disconnected" when deregistered from broker (#4878) @Steve-Mcl
 - MQTT: Ensure will payload is a string (#4873) @knolleary
 - Let batch node terminate "early" if msg.parts set to end of sequence (#4829) @dceejay
 - Fix unintentional Capitalisation in Split node name (#4835) @dceejay

#### 4.0.2: Maintenance Release

Editor

 - Use a more subtle border on the header (#4818) @bonanitech
 - Improve the editor's French translations (#4824) @GogoVega
 - Clean up orphaned editors (#4821) @Steve-Mcl
 - Fix node validation if the property is not required (#4812) @GogoVega
 - Ensure mermaid.min.js is cached properly between loads of the editor (#4817) @knolleary

Runtime

 - Allow auth cookie name to be customised (#4815) @knolleary
 - Guard against undefined sessions in multiplayer (#4816) @knolleary

#### 4.0.1: Maintenance Release

Editor

 - Ensure subflow instance credential property values are extracted (#4802) @knolleary
 - Use `_ADD_` value for both `add new...` and `none` options (#4800) @GogoVega
 - Fix the config node select value assignment (#4788) @GogoVega
 - Add tooltip for number of subflow instance on info tab (#4786) @kazuhitoyokoi
 - Add Japanese translations for v4.0.0 (#4785) @kazuhitoyokoi

Runtime

 - Ensure group nodes are properly exported in /flow api (#4803) @knolleary

 Nodes

 - Joins: make using msg.parts optional in join node (#4796) @dceejay
 - HTTP Request: UI proxy should setup agents for both http_proxy and https_proxy (#4794) @Steve-Mcl
 - HTTP Request: Remove default user agent (#4791) @Steve-Mcl

#### 4.0.0: Milestone Release

This marks the next major release of Node-RED. The following changes represent
those added since the last beta. Check the beta release details below for the complete
list.

Breaking Changes

 - Node-RED now requires Node 18.x or later. At the time of release, we recommend
   using Node 20.

Editor

 - Add `httpStaticCors` (#4761) @knolleary
 - Update dependencies (#4763) @knolleary
 - Sync master to dev (#4756) @knolleary
 - Add tooltip and message validation to `typedInput` (#4747) @GogoVega
 - Replace bcrypt with @node-rs/bcrypt (#4744) @knolleary
 - Export Nodes dialog refinement (#4746) @Steve-Mcl

#### 4.0.0-beta.4: Beta Release

Editor

 - Fix the Sidebar Config is not refreshed after a deploy (#4734) @GogoVega
 - Fix checkboxes are not updated when calling `typedInput("value", "")` (#4729) @GogoVega
 - Fix panning with middle mouse button on windows 10/11 (#4716) @corentin-sodebo-voile
 - Add Japanese translation for sidebar tooltip (#4727) @kazuhitoyokoi
 - Translate the number of items selected in the options list (#4730) @GogoVega
 - Fix a checkbox should return a Boolean value and not the string `on` (#4715) @GogoVega
 - Deleting a grouped node should update the group (#4714) @GogoVega
 - Change the Config Node cursor to `pointer` (#4711) @GogoVega
 - Add missing tooltips to Sidebar (#4713) @GogoVega
 - Allow nodes to return additional history entries in onEditSave (#4710) @knolleary
 - Update to Monaco 0.49.0 (#4725) @Steve-Mcl
 - Add Japanese translations for 4.0.0-beta.3 (#4726) @kazuhitoyokoi
 - Show lock on deploy if user is read-only (#4706) @knolleary

Runtime

 - Ensure all CSS variables are in the output file (#3743) @bonanitech
 - Add httpAdminCookieOptions (#4718) @knolleary
 - chore: migrate deprecated `util.isArray` (#4724) @Rotzbua
 - Add --version cli args (#4707) @knolleary
 - feat(grunt): fail if files are missing (#4739) @Rotzbua
 - fix(node-red-pi): node-red not started by path (#4736) @Rotzbua
 - fix(editor): remove trailing slash (#4735) @Rotzbua
 - fix: remove deprecated mqtt.js (#4733) @Rotzbua 

Nodes

 - Perform Proxy logic more like cURL (#4616) @Steve-Mcl

#### 4.0.0-beta.3: Beta Release

Editor

 - Improve background-deploy notification handling (#4692) @knolleary
 - Hide workspace tab on middle mouse click (#4657) @Steve-Mcl
 - multiplayer: Add user presence indicators (#4666) @knolleary
 - Enable updating dependency node of package.json in project feature (#4676) @kazuhitoyokoi
 - Add French translations for 4.0.0-beta.2 (#4681) @GogoVega
 - Add Japanese translations for 4.0.0-beta.2 (#4674) @kazuhitoyokoi
 - Fix saving of conf-type properties in module packaged subflows (#4658) @knolleary
 - Add npm install timeout notification (#4662) @hardillb
 - Fix undo of subflow env property edits (#4667) @knolleary
 - Fix three error typos in monaco.js (#4660) @JoshuaCWebDeveloper
 - docs: Add closing paragraph tag (#4664) @ZJvandeWeg
 - Avoid login loops when autoLogin enabled but login fails (#4684) @knolleary

Runtime

 - Allow blank strings to be used for env var property substitutions (#4672) @knolleary
 - Use rfdc for cloning pure JSON values (#4679) @knolleary
 - fix: remove outdated Node 11+ check (#4314) @Rotzbua
 - feat(ci): add new nodejs v22 (#4694) @Rotzbua
 - fix(node): increase required node >=18.5 (#4690) @Rotzbua
 - fix(dns): remove outdated node check (#4689) @Rotzbua
 - fix(polyfill): remove import module polyfill (#4688) @Rotzbua
 - Fix typo (#4686) @Rotzbua

Nodes

 - Pass full error object in Function node and copy over cause property (#4685) @knolleary
 - Replacing vm.createScript in favour of vm.Script (#4534) @patlux

#### 4.0.0-beta.2: Beta Release

Editor

 - Introduce multiplayer feature (#4629) @knolleary
 - Separate the "add new config-node" option into a new (+) button (#4627) @GogoVega
 - Retain Palette categories collapsed and filter to localStorage (#4634) @knolleary
 - Ensure palette filter reapplies and clear up unknown categories (#4637) @knolleary
 - Add support for plugin (only) modules to the palette manager (#4620) @knolleary
 - Update monaco to latest and node types to 18 LTS (#4615) @Steve-Mcl

Runtime

 - Fix handling of subflow config-node select type in sf module (#4643) @knolleary
 - Comms API updates (#4628) @knolleary
 - Add French translations for 4.0.0-beta.1 (#4621) @GogoVega
 - Add Japanese translations for 4.0.0-beta.1 (#4612) @kazuhitoyokoi

Nodes
 - Fix change node handling of replacing with boolean (#4639) @knolleary

#### 4.0.0-beta.1: Beta Release

Editor

 - Click on id in debug panel highlights node or flow (#4439) @ralphwetzel
 - Support config selection in a subflow env var (#4587) @Steve-Mcl
 - Add timestamp formatting options to TypedInput (#4468) @knolleary
 - Allow RED.view.select to select links (#4553) @lgrkvst
 - Add auto-complete to flow/global/env typedInput types (#4480) @knolleary
 - Improve the appearance of the Node-RED primary header (#4598) @joepavitt

Runtime

 - let settings.httpNodeAuth accept single middleware or array of middlewares (#4572) @kevinGodell
 - Upgrade to JSONata 2.x (#4590) @knolleary
 - Bump minimum version to node 18 (#4571) @knolleary
 - npm: Remove production flag on npm invocation (#4347) @ZJvandeWeg
 - Timer testing fix (#4367) @hlovdal
 - Bump to 4.0.0-dev (#4322) @knolleary

Nodes

 - TCP node - when resetting, if no payload, stay disconnected @dceejay
 - HTML node: add option for collecting attributes and content (#4513) @gorenje
 - let split node specify property to split on, and join auto join correctly (#4386) @dceejay
 - Add RFC4180 compliant mode to CSV node (#4540) @Steve-Mcl
 - Fix change node to return boolean if asked (#4525) @dceejay
 - Let msg.reset reset Tcp request node connection when in stay connected mode (#4406) @dceejay
 - Let debug node status msg length be settable via settings (#4402) @dceejay
 - Feat: Add ability to set headers for WebSocket client (#4436) @marcus-j-davies

#### Older Releases

Change logs for older releases are available on GitHub: https://github.com/node-red/node-red/releases
