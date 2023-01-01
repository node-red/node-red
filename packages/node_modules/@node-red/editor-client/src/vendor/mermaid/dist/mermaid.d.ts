/**
 * Web page integration module for the mermaid framework. It uses the mermaidAPI for mermaid
 * functionality and to render the diagrams to svg code!
 */
import { MermaidConfig } from './config.type';
import { mermaidAPI } from './mermaidAPI';
import type { ParseErrorFunction } from './Diagram';
import { type DetailedError } from './utils';
import { ExternalDiagramDefinition } from './diagram-api/types';
export type { MermaidConfig, DetailedError, ExternalDiagramDefinition, ParseErrorFunction };
/**
 * ## init
 *
 * Function that goes through the document to find the chart definitions in there and render them.
 *
 * The function tags the processed attributes with the attribute data-processed and ignores found
 * elements with the attribute already set. This way the init function can be triggered several
 * times.
 *
 * ```mermaid
 * graph LR;
 *  a(Find elements)-->b{Processed}
 *  b-->|Yes|c(Leave element)
 *  b-->|No |d(Transform)
 * ```
 *
 * Renders the mermaid diagrams
 *
 * @param config - **Deprecated**, please set configuration in {@link initialize}.
 * @param nodes - **Default**: `.mermaid`. One of the following:
 * - A DOM Node
 * - An array of DOM nodes (as would come from a jQuery selector)
 * - A W3C selector, a la `.mermaid`
 * @param callback - Called once for each rendered diagram's id.
 */
declare const init: (config?: MermaidConfig, nodes?: string | HTMLElement | NodeListOf<HTMLElement>, callback?: Function) => Promise<void>;
declare const initThrowsErrors: (config?: MermaidConfig, nodes?: string | HTMLElement | NodeListOf<HTMLElement>, callback?: Function) => void;
/**
 * Equivalent to {@link init}, except an error will be thrown on error.
 *
 * @alpha
 * @deprecated This is an internal function and will very likely be modified in v10, or earlier.
 * We recommend staying with {@link initThrowsErrors} if you don't need `lazyLoadedDiagrams`.
 *
 * @param config - **Deprecated** Mermaid sequenceConfig.
 * @param nodes - One of:
 * - A DOM Node
 * - An array of DOM nodes (as would come from a jQuery selector)
 * - A W3C selector, a la `.mermaid` (default)
 * @param callback - Function that is called with the id of each generated mermaid diagram.
 * @returns Resolves on success, otherwise the {@link Promise} will be rejected.
 */
declare const initThrowsErrorsAsync: (config?: MermaidConfig, nodes?: string | HTMLElement | NodeListOf<HTMLElement>, callback?: Function) => Promise<void>;
declare const initialize: (config: MermaidConfig) => void;
/**
 * Used to register external diagram types.
 * @param diagrams - Array of {@link ExternalDiagramDefinition}.
 * @param opts - If opts.lazyLoad is true, the diagram will be loaded on demand.
 */
declare const registerExternalDiagrams: (diagrams: ExternalDiagramDefinition[], { lazyLoad, }?: {
    lazyLoad?: boolean | undefined;
}) => Promise<void>;
/**
 * ##contentLoaded Callback function that is called when page is loaded. This functions fetches
 * configuration for mermaid rendering and calls init for rendering the mermaid diagrams on the
 * page.
 */
declare const contentLoaded: () => void;
/**
 * ## setParseErrorHandler  Alternative to directly setting parseError using:
 *
 * ```js
 * mermaid.parseError = function(err,hash){=
 *   forExampleDisplayErrorInGui(err);  // do something with the error
 * };
 * ```
 *
 * This is provided for environments where the mermaid object can't directly have a new member added
 * to it (eg. dart interop wrapper). (Initially there is no parseError member of mermaid).
 *
 * @param newParseErrorHandler - New parseError() callback.
 */
declare const setParseErrorHandler: (newParseErrorHandler: (err: any, hash: any) => void) => void;
declare const parse: (txt: string) => boolean;
/**
 * @param txt - The mermaid code to be parsed.
 * @deprecated This is an internal function and should not be used. Will be removed in v10.
 */
declare const parseAsync: (txt: string) => Promise<boolean>;
/**
 * @deprecated This is an internal function and should not be used. Will be removed in v10.
 */
declare const renderAsync: (id: string, text: string, cb?: ((svgCode: string, bindFunctions?: ((element: Element) => void) | undefined) => void) | undefined, container?: Element) => Promise<string>;
declare const mermaid: {
    startOnLoad: boolean;
    diagrams: any;
    parseError?: ParseErrorFunction;
    mermaidAPI: typeof mermaidAPI;
    parse: typeof parse;
    parseAsync: typeof parseAsync;
    render: typeof mermaidAPI.render;
    renderAsync: typeof renderAsync;
    init: typeof init;
    initThrowsErrors: typeof initThrowsErrors;
    initThrowsErrorsAsync: typeof initThrowsErrorsAsync;
    registerExternalDiagrams: typeof registerExternalDiagrams;
    initialize: typeof initialize;
    contentLoaded: typeof contentLoaded;
    setParseErrorHandler: typeof setParseErrorHandler;
};
export default mermaid;
