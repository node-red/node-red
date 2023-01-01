import { type ParseErrorFunction } from './Diagram';
import { MermaidConfig } from './config.type';
interface DiagramStyleClassDef {
    id: string;
    styles?: string[];
    textStyles?: string[];
}
export declare type D3Element = any;
/**
 * @param text - The mermaid diagram definition.
 * @param parseError - If set, handles errors.
 */
declare function parse(text: string, parseError?: ParseErrorFunction): boolean;
/**
 * @param text - The mermaid diagram definition.
 * @param parseError - If set, handles errors.
 */
declare function parseAsync(text: string, parseError?: ParseErrorFunction): Promise<boolean>;
/**
 * @param  text - text to be encoded
 * @returns
 */
export declare const encodeEntities: (text: string) => string;
/**
 *
 * @param  text - text to be decoded
 * @returns
 */
export declare const decodeEntities: (text: string) => string;
/**
 * Create a CSS style that starts with the given class name, then the element,
 * with an enclosing block that has each of the cssClasses followed by !important;
 * @param cssClass - CSS class name
 * @param element - CSS element
 * @param cssClasses - list of CSS styles to append after the element
 * @returns - the constructed string
 */
export declare const cssImportantStyles: (cssClass: string, element: string, cssClasses?: string[]) => string;
/**
 * Create the user styles
 *
 * @param  config - configuration that has style and theme settings to use
 * @param graphType - used for checking if classDefs should be applied
 * @param  classDefs - the classDefs in the diagram text. Might be null if none were defined. Usually is the result of a call to getClasses(...)
 * @returns  the string with all the user styles
 */
export declare const createCssStyles: (config: MermaidConfig, graphType: string, classDefs?: Record<string, DiagramStyleClassDef> | null | undefined) => string;
export declare const createUserStyles: (config: MermaidConfig, graphType: string, classDefs: Record<string, DiagramStyleClassDef>, svgId: string) => string;
/**
 * Clean up svgCode. Do replacements needed
 *
 * @param svgCode - the code to clean up
 * @param inSandboxMode - security level
 * @param useArrowMarkerUrls - should arrow marker's use full urls? (vs. just the anchors)
 * @returns the cleaned up svgCode
 */
export declare const cleanUpSvgCode: (svgCode: string | undefined, inSandboxMode: boolean, useArrowMarkerUrls: boolean) => string;
/**
 * Put the svgCode into an iFrame. Return the iFrame code
 *
 * @param svgCode - the svg code to put inside the iFrame
 * @param svgElement - the d3 node that has the current svgElement so we can get the height from it
 * @returns  - the code with the iFrame that now contains the svgCode
 * TODO replace btoa(). Replace with  buf.toString('base64')?
 */
export declare const putIntoIFrame: (svgCode?: string, svgElement?: D3Element) => string;
/**
 * Append an enclosing div, then svg, then g (group) to the d3 parentRoot. Set attributes.
 * Only set the style attribute on the enclosing div if divStyle is given.
 * Only set the xmlns:xlink attribute on svg if svgXlink is given.
 * Return the last node appended
 *
 * @param parentRoot - the d3 node to append things to
 * @param id - the value to set the id attr to
 * @param enclosingDivId - the id to set the enclosing div to
 * @param divStyle - if given, the style to set the enclosing div to
 * @param svgXlink - if given, the link to set the new svg element to
 * @returns - returns the parentRoot that had nodes appended
 */
export declare const appendDivSvgG: (parentRoot: D3Element, id: string, enclosingDivId: string, divStyle?: string, svgXlink?: string) => D3Element;
/**
 * Remove any existing elements from the given document
 *
 * @param doc - the document to removed elements from
 * @param id - id for any existing SVG element
 * @param divSelector - selector for any existing enclosing div element
 * @param iFrameSelector - selector for any existing iFrame element
 */
export declare const removeExistingElements: (doc: Document, id: string, divId: string, iFrameId: string) => void;
/**
 * @param  options - Initial Mermaid options
 */
declare function initialize(options?: MermaidConfig): void;
/**
 * ## mermaidAPI configuration defaults
 *
 * ```ts
 *   const config = {
 *     theme: 'default',
 *     logLevel: 'fatal',
 *     securityLevel: 'strict',
 *     startOnLoad: true,
 *     arrowMarkerAbsolute: false,
 *
 *     er: {
 *       diagramPadding: 20,
 *       layoutDirection: 'TB',
 *       minEntityWidth: 100,
 *       minEntityHeight: 75,
 *       entityPadding: 15,
 *       stroke: 'gray',
 *       fill: 'honeydew',
 *       fontSize: 12,
 *       useMaxWidth: true,
 *     },
 *     flowchart: {
 *       diagramPadding: 8,
 *       htmlLabels: true,
 *       curve: 'basis',
 *     },
 *     sequence: {
 *       diagramMarginX: 50,
 *       diagramMarginY: 10,
 *       actorMargin: 50,
 *       width: 150,
 *       height: 65,
 *       boxMargin: 10,
 *       boxTextMargin: 5,
 *       noteMargin: 10,
 *       messageMargin: 35,
 *       messageAlign: 'center',
 *       mirrorActors: true,
 *       bottomMarginAdj: 1,
 *       useMaxWidth: true,
 *       rightAngles: false,
 *       showSequenceNumbers: false,
 *     },
 *     gantt: {
 *       titleTopMargin: 25,
 *       barHeight: 20,
 *       barGap: 4,
 *       topPadding: 50,
 *       leftPadding: 75,
 *       gridLineStartPadding: 35,
 *       fontSize: 11,
 *       fontFamily: '"Open Sans", sans-serif',
 *       numberSectionStyles: 4,
 *       axisFormat: '%Y-%m-%d',
 *       topAxis: false,
 *     },
 *   };
 *   mermaid.initialize(config);
 * ```
 */
export declare const mermaidAPI: Readonly<{
    render: (id: string, text: string, cb?: ((svgCode: string, bindFunctions?: ((element: Element) => void) | undefined) => void) | undefined, svgContainingElement?: Element) => string;
    renderAsync: (id: string, text: string, cb?: ((svgCode: string, bindFunctions?: ((element: Element) => void) | undefined) => void) | undefined, svgContainingElement?: Element) => Promise<string>;
    parse: typeof parse;
    parseAsync: typeof parseAsync;
    parseDirective: (p: any, statement: string, context: string, type: string) => void;
    initialize: typeof initialize;
    getConfig: () => MermaidConfig;
    setConfig: (conf: MermaidConfig) => MermaidConfig;
    getSiteConfig: () => MermaidConfig;
    updateSiteConfig: (conf: MermaidConfig) => MermaidConfig;
    reset: () => void;
    globalReset: () => void;
    defaultConfig: MermaidConfig;
}>;
export default mermaidAPI;
