
/* NOTE: Do not edit directly! This file is generated using `npm run update-types` in https://github.com/Steve-Mcl/monaco-editor-esm-i18n */

interface NodeMessage {
    topic?: string;
    payload?: any;
    _msgid?: string;
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
 * @property {string} [fill] The fill property can be: red, green, yellow, blue or grey.
 * @property {string} [shape] The shape property can be: ring or dot.
 * @property {string} [text] The text to display
 */
interface NodeStatus {
    /** The fill property can be: red, green, yellow, blue or grey */
    fill?: string,
    /** The shape property can be: ring or dot */
    shape?: string,
    /** The text to display */
    text?: string|boolean|number
}

declare class node {
    /**
    * Send 1 or more messages asynchronously
    * @param {object | object[]} msg  The msg object
    * @param {Boolean} [clone=true]  Flag to indicate the `msg` should be cloned. Default = `true`
    * @see node-red documentation [writing-functions: sending messages asynchronously](https://nodered.org/docs/user-guide/writing-functions#sending-messages-asynchronously)
    */
    static send(msg:object|object[], clone?:Boolean): void;
    /** Inform runtime this instance has completed its operation */
    static done();
    /** Send an error to the console and debug side bar. Include `msg` in the 2nd parameter to trigger the catch node.  */
    static error(err:string|Error, msg?:object);
    /** Log a warn message to the console and debug sidebar */
    static warn(warning:string|object);
    /** Log an info message to the console (not sent to sidebar)' */
    static log(info:string|object);
    /** Sets the status icon and text underneath the node.
    * @param {NodeStatus} status - The status object `{fill, shape, text}`
    * @see node-red documentation [writing-functions: adding-status](https://nodered.org/docs/user-guide/writing-functions#adding-status)
    */
    static status(status:NodeStatus);
    /** Sets the status text underneath the node.
    * @param {string} status - The status to display
    * @see node-red documentation [writing-functions: adding-status](https://nodered.org/docs/user-guide/writing-functions#adding-status)
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
declare class env {
    /** 
     * Get an environment variable value  
     * 
     * Predefined node-red variables...  
     *   * `NR_NODE_ID` - the ID of the node
     *   * `NR_NODE_NAME` - the Name of the node
     *   * `NR_NODE_PATH` - the Path of the node
     *   * `NR_GROUP_ID` - the ID of the containing group
     *   * `NR_GROUP_NAME` - the Name of the containing group
     *   * `NR_FLOW_ID` - the ID of the flow the node is on
     *   * `NR_FLOW_NAME` - the Name of the flow the node is on
     * @param name Name of the environment variable to get
     * @example 
     * ```const flowName = env.get("NR_FLOW_NAME");```
     */
    static get(name:string) :any;
}
