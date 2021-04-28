Node-RED consists of 6 node modules under the `@node-red` scope, which are pulled together
by the top-level `node-red` module. The typical scenario is where you are embedding Node-RED into your
own application, in which case you would use the `node-red` module rather than any of the
internal modules directly.

```javascript
let RED = require("node-red");
```


Module | Description
-------|-------
[node-red](node-red.html) | the main module that pulls together all of the internal modules and provides the executable version of Node-RED
[@node-red/editor-api](@node-red_editor-api.html) | an Express application that serves the Node-RED editor and provides the Admin HTTP API
[@node-red/runtime](@node-red_runtime.html) | the core runtime of Node-RED
[@node-red/util](@node-red_util.html) | common utilities for the Node-RED runtime and editor modules
[@node-red/registry](@node-red_registry.html) | the internal node registry
@node-red/nodes | the default set of core nodes. This module only contains the Node-RED nodes - it does not expose any APIs.
@node-red/editor-client | the client-side resources of the Node-RED editor application
