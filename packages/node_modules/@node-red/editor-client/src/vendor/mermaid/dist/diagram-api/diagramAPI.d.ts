import { DiagramDefinition, DiagramDetector } from './types';
export declare const log: Record<import("../logger").LogLevel, {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
}>;
export declare const setLogLevel: (level?: string | number) => void;
export declare const getConfig: () => import("../config.type").MermaidConfig;
export declare const sanitizeText: (text: string) => string;
export declare const setupGraphViewbox: (graph: any, svgElem: any, padding: any, useMaxWidth: any) => void;
export interface Detectors {
    [key: string]: DiagramDetector;
}
/**
 * Registers the given diagram with Mermaid.
 *
 * Can be used for third-party custom diagrams.
 *
 * @param id - A unique ID for the given diagram.
 * @param diagram - The diagram definition.
 * @param detector - Function that returns `true` if a given mermaid text is this diagram definition.
 */
export declare const registerDiagram: (id: string, diagram: DiagramDefinition, detector?: DiagramDetector) => void;
export declare const getDiagram: (name: string) => DiagramDefinition;
