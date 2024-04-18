
/* NOTE: Do not edit directly! This file is generated using `npm run update-types` in https://github.com/node-red/nr-monaco-build */

interface NodeMessage {
    topic?: string;
    payload?: any;
    /** `_msgid` is generated internally. It not something you typically need to set or modify. */ _msgid?: string;
    [other: string]: any; //permit other properties
}

/** @type {NodeMessage} the `msg` object */
declare var msg: NodeMessage;
/** @type {string} the id of the incoming `msg` (alias of msg._msgid) */
declare const __msgid__:string;

declare const util:typeof import('util')
declare const promisify:typeof import('util').promisify

/**
 * @typedef NodeStatus
 * @type {object}
 * @property {'red'|'green'|'yellow'|'blue'|'grey'|string} [fill] - The fill property can be: red, green, yellow, blue or grey.
 * @property {'ring'|'dot'|string} [shape] The shape property can be: ring or dot.
 * @property {string|boolean|number} [text] The text to display
 */
interface NodeStatus {
    /** The fill property can be: red, green, yellow, blue or grey */
    fill?: 'red'|'green'|'yellow'|'blue'|'grey'|string,
    /** The shape property can be: ring or dot */
    shape?: 'ring'|'dot'|string,
    /** The text to display */
    text?: string|boolean|number
}

declare class node {
    /**
    * Send 1 or more messages asynchronously
    * @param {object | object[]} msg  The msg object
    * @param {Boolean} [clone=true]  Flag to indicate the `msg` should be cloned. Default = `true`
    * @see Node-RED documentation [writing-functions: sending messages asynchronously](https://nodered.org/docs/user-guide/writing-functions#sending-messages-asynchronously)
    */
    static send(msg:NodeMessage|NodeMessage[], clone?:Boolean): void;
    /** Inform runtime this instance has completed its operation */
    static done();
    /** Send an error to the console and debug side bar. Include `msg` in the 2nd parameter to trigger the catch node.  */
    static error(err:string|Error, msg?:NodeMessage);
    /** Log a warn message to the console and debug sidebar */
    static warn(warning:string|object);
    /** Log an info message to the console (not sent to sidebar)' */
    static log(info:string|object);
    /** Sets the status icon and text underneath the node.
    * @param {NodeStatus} status - The status object `{fill, shape, text}`
    * @see Node-RED documentation [writing-functions: adding-status](https://nodered.org/docs/user-guide/writing-functions#adding-status)
    */
    static status(status:NodeStatus);
    /** Sets the status text underneath the node.
    * @see Node-RED documentation [writing-functions: adding-status](https://nodered.org/docs/user-guide/writing-functions#adding-status)
    */
    static status(status:string|boolean|number);
    /** the id of this node */
    public static readonly id:string;
    /** the name of this node */
    public static readonly name:string;
    /** the path identifier for this node */
    public static readonly path:string;
    /** the number of outputs of this node */
    public static readonly outputCount:number;
}
declare class context {
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name of context variable
     */
    static get(name: string | string[]);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], callback: Function);
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     */
    static get(name: string | string[], store: string);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], store: string, callback: Function);


    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     */
    static set(name: string | string[], value?: any | any[]);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], callback?: Function);
    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     */
    static set(name: string | string[], value?: any | any[], store?: string);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], store?: string, callback?: Function);

    /** Get an array of the keys in the context store */
    static keys(): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(store: string): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(callback: Function);
    /** Get an array of the keys in the context store */
    static keys(store: string, callback: Function);
}
declare class flow {
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name of context variable
     */
    static get(name: string | string[]);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], callback: Function);
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     */
    static get(name: string | string[], store: string);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], store: string, callback: Function);


    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     */
    static set(name: string | string[], value?: any | any[]);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], callback?: Function);
    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     */
    static set(name: string | string[], value?: any | any[], store?: string);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], store?: string, callback?: Function);

    /** Get an array of the keys in the context store */
    static keys(): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(store: string): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(callback: Function);
    /** Get an array of the keys in the context store */
    static keys(store: string, callback: Function);
}

// @ts-ignore
declare class global {
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name of context variable
     */
    static get(name: string | string[]);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], callback: Function);
    /**
     * Get one or multiple values from context (synchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     */
    static get(name: string | string[], store: string);
    /**
     * Get one or multiple values from context (asynchronous).
     * @param name - Name (or array of names) to get from context
     * @param store - Name of context store
     * @param {function} callback - (optional) Callback function (`(err,value) => {}`)
     */
    static get(name: string | string[], store: string, callback: Function);


    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     */
    static set(name: string | string[], value?: any | any[]);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], callback?: Function);
    /**
     * Set one or multiple values in context (synchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     */
    static set(name: string | string[], value?: any | any[], store?: string);
    /**
     * Set one or multiple values in context (asynchronous).
     * @param name - Name (or array of names) to set in context
     * @param value - The value (or array of values) to store in context. If the value(s) are null/undefined, the context item(s) will be removed.
     * @param store - (optional) Name of context store
     * @param callback - (optional) Callback function (`(err) => {}`)
     */
    static set(name: string | string[], value?: any | any[], store?: string, callback?: Function);

    /** Get an array of the keys in the context store */
    static keys(): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(store: string): Array<string>;
    /** Get an array of the keys in the context store */
    static keys(callback: Function);
    /** Get an array of the keys in the context store */
    static keys(store: string, callback: Function);
}

// (string & {}) is a workaround for offering string type completion without enforcing it. See https://github.com/microsoft/TypeScript/issues/29729#issuecomment-567871939
type NR_ENV_NAME_STRING = 'NR_NODE_ID'|'NR_NODE_NAME'|'NR_NODE_PATH'|'NR_GROUP_ID'|'NR_GROUP_NAME'|'NR_FLOW_ID'|'NR_FLOW_NAME'|'NR_SUBFLOW_ID'|'NR_SUBFLOW_NAME'|'NR_SUBFLOW_PATH' | (string & {})
declare class env {
    /** 
     * Get an environment variable value defined in the OS, or in the global/flow/subflow/group environment variables.  
     * 
     * Predefined node-red variables...  
     *   * `NR_NODE_ID` - the ID of the node
     *   * `NR_NODE_NAME` - the Name of the node
     *   * `NR_NODE_PATH` - the Path of the node
     *   * `NR_GROUP_ID` - the ID of the containing group
     *   * `NR_GROUP_NAME` - the Name of the containing group
     *   * `NR_FLOW_ID` - the ID of the flow the node is on
     *   * `NR_FLOW_NAME` - the Name of the flow the node is on
     *   * `NR_SUBFLOW_ID` - the ID of the subflow the node is in
     *   * `NR_SUBFLOW_NAME` - the Name of the subflow the node is in
     *   * `NR_SUBFLOW_PATH` - the Path of the subflow the node is in
     * @param name - The name of the environment variable
     * @example 
     * ```const flowName = env.get("NR_FLOW_NAME") // get the name of the flow```
     * @example 
     * ```const systemHomeDir = env.get("HOME") // get the user's home directory```
     * @example 
     * ```const systemHomeDir = env.get("LABEL1") // get the value of a global/flow/subflow/group defined variable named "LABEL1"```
     */
    static get(name:NR_ENV_NAME_STRING) :any;
}
