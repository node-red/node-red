
/* NOTE: Do not edit directly! This file is generated using `npm run update-types` in https://github.com/node-red/nr-monaco-build */


/*
How to generate...
1. Generate from packages\node_modules\@node-red\util\lib\util.js using `npx typescript` and a tsconfig.json of...
{
    "files": ["packages/node_modules/@node-red/util/lib/util.js"],
    "compilerOptions": {
      "allowJs": true,
      "declaration": true,
      "emitDeclarationOnly": true,
      "outDir": "types",
      "strict": false,
      "moduleResolution": "node"
    }
}
2. remove all the `export ` statements
3. Wrap the remaining code in  declare namespace RED {  declare namespace util {  ...  } }
4. check . adjust types like String --> string, Object --> object etc (where appropriate)
*/

declare namespace RED {
    /**
     * Utility functions for the node-red function sandbox
     */
    namespace util {

        /**
         * Encode an object to JSON without losing information about non-JSON types
         * such as Buffer and Function.
         *
         * *This function is closely tied to its reverse within the editor*
         *
         * @param {Object} msg
         * @param {Object} opts
         * @return {Object} the encoded object
         * @memberof @node-red/util_util
         */
        function encodeObject(msg: any, opts: any): any;
        /**
         * Converts the provided argument to a String, using type-dependent
         * methods.
         *
         * @param  {any}    o - the property to convert to a String
         * @return {string} the stringified version
         * @memberof @node-red/util_util
         */
        function ensureString(o: any): string;
        /**
         * Converts the provided argument to a Buffer, using type-dependent
         * methods.
         *
         * @param  {any}    o - the property to convert to a Buffer
         * @return {string} the Buffer version
         * @memberof @node-red/util_util
         */
        function ensureBuffer(o: any): string;
        /**
         * Safely clones a message object. This handles msg.req/msg.res objects that must
         * not be cloned.
         *
         * @param  {object} msg - the message object to clone
         * @return {object} the cloned message
         * @memberof @node-red/util_util
         */
        function cloneMessage(msg: object): object;
        /**
         * Compares two objects, handling various JavaScript types.
         *
         * @param  {any}    obj1
         * @param  {any}    obj2
         * @return {boolean} whether the two objects are the same
         * @memberof @node-red/util_util
         */
        function compareObjects(obj1: any, obj2: any): boolean;
        /**
         * Generates a psuedo-unique-random id.
         * @return {string} a random-ish id
         * @memberof @node-red/util_util
         */
        function generateId(): string;
        /**
         * Gets a property of a message object.
         *
         * Unlike {@link @node-red/util-util.getObjectProperty}, this function will strip `msg.` from the
         * front of the property expression if present.
         *
         * @param  {object} msg - the message object
         * @param  {string} expr - the property expression
         * @return {any} the message property, or undefined if it does not exist
         * @throws Will throw an error if the *parent* of the property does not exist
         * @memberof @node-red/util_util
         */
        function getMessageProperty(msg: object, expr: string): any;
        /**
         * Sets a property of a message object.
         *
         * Unlike {@link @node-red/util-util.setObjectProperty}, this function will strip `msg.` from the
         * front of the property expression if present.
         *
         * @param  {object}  msg           - the message object
         * @param  {string}  prop          - the property expression
         * @param  {any}     [value]         - the value to set
         * @param  {boolean} [createMissing] - whether to create missing parent properties
         * @memberof @node-red/util_util
         */
        function setMessageProperty(msg: object, prop: string, value?: any, createMissing?: boolean): boolean;
        /**
         * Gets a property of an object.
         *
         * Given the object:
         *
         *     {
         *       "pet": {
         *           "type": "cat"
         *       }
         *     }
         *
         * - `pet.type` will return `"cat"`.
         * - `pet.name` will return `undefined`
         * - `car` will return `undefined`
         * - `car.type` will throw an Error (as `car` does not exist)
         *
         * @param  {object} msg - the object
         * @param  {string} expr - the property expression
         * @return {any} the object property, or undefined if it does not exist
         * @throws Will throw an error if the *parent* of the property does not exist
         * @memberof @node-red/util_util
         */
        function getObjectProperty(msg: object, expr: string): any;
        /**
         * Sets a property of an object.
         *
         * @param  {object}  msg           - the object
         * @param  {string}  prop          - the property expression
         * @param  {any}     [value]         - the value to set
         * @param  {boolean} [createMissing] - whether to create missing parent properties
         * @memberof @node-red/util_util
         */
        function setObjectProperty(msg: object, prop: string, value?: any, createMissing?: boolean): boolean;
        /**
         * Evaluates a property value according to its type.
         *
         * @param  {string}   value    - the raw value
         * @param  {string}   type     - the type of the value
         * @param  {Node}     node     - the node evaluating the property
         * @param  {Object}   msg      - the message object to evaluate against
         * @param  {Function} callback - (optional) called when the property is evaluated
         * @return {any} The evaluated property, if no `callback` is provided
         * @memberof @node-red/util_util
         */
        function evaluateNodeProperty(value: string, type: string, node: Node, msg: any, callback: Function): any;
        /**
         * Parses a property expression, such as `msg.foo.bar[3]` to validate it
         * and convert it to a canonical version expressed as an Array of property
         * names.
         *
         * For example, `a["b"].c` returns `['a','b','c']`
         *
         * @param  {string} str - the property expression
         * @return {any[]} the normalised expression
         * @memberof @node-red/util_util
         */
        function normalisePropertyExpression(str: string): any[];
        /**
         * Normalise a node type name to camel case.
         *
         * For example: `a-random node type` will normalise to `aRandomNodeType`
         *
         * @param  {string} name - the node type
         * @return {string} The normalised name
         * @memberof @node-red/util_util
         */
        function normaliseNodeTypeName(name: string): string;
        /**
         * Prepares a JSONata expression for evaluation.
         * This attaches Node-RED specific functions to the expression.
         *
         * @param  {string} value - the JSONata expression
         * @param  {Node}   node  - the node evaluating the property
         * @return {any} The JSONata expression that can be evaluated
         * @memberof @node-red/util_util
         */
        function prepareJSONataExpression(value: string, node: Node): any;
        /**
         * Evaluates a JSONata expression.
         * The expression must have been prepared with {@link @node-red/util-util.prepareJSONataExpression}
         * before passing to this function.
         *
         * @param  {Object}   expr     - the prepared JSONata expression
         * @param  {Object}   msg      - the message object to evaluate against
         * @param  {Function} callback - (optional) called when the expression is evaluated
         * @return {any} If no callback was provided, the result of the expression
         * @memberof @node-red/util_util
         */
        function evaluateJSONataExpression(expr: any, msg: any, callback: Function): any;
        /**
         * Parses a context property string, as generated by the TypedInput, to extract
         * the store name if present.
         *
         * For example, `#:(file)::foo` results in ` { store: "file", key: "foo" }`.
         *
         * @param  {string} key - the context property string to parse
         * @return {any} The parsed property
         * @memberof @node-red/util_util
         */
        function parseContextStore(key: string): any;
    }
}
