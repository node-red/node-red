import { MermaidConfig } from '../config.type';
import { DiagramDetector, DiagramLoader } from './types';
/**
 * Detects the type of the graph text.
 *
 * Takes into consideration the possible existence of an `%%init` directive
 *
 * @param text - The text defining the graph. For example:
 *
 * ```mermaid
 *   %%{initialize: {"startOnLoad": true, logLevel: "fatal" }}%%
 *   graph LR
 *    a-->b
 *    b-->c
 *    c-->d
 *    d-->e
 *    e-->f
 *    f-->g
 *    g-->h
 * ```
 *
 * @param config - The mermaid config.
 * @returns A graph definition key
 */
export declare const detectType: (text: string, config?: MermaidConfig) => string;
export declare const addDetector: (key: string, detector: DiagramDetector, loader?: DiagramLoader) => void;
export declare const getDiagramLoader: (key: string) => DiagramLoader | undefined;
