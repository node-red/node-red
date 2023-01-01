export function parseDirective(statement: any, context: any, type: any): void;
export function lookUpDomId(id: any): any;
export function addVertex(_id: any, text: any, type: any, style: any, classes: any, dir: any, props?: {}): void;
export function addSingleLink(_start: any, _end: any, type: any, linkText: any): void;
export function addLink(_start: any, _end: any, type: any, linktext: any): void;
export function updateLinkInterpolate(positions: any, interp: any): void;
export function updateLink(positions: any, style: any): void;
export function addClass(id: any, style: any): void;
export function setDirection(dir: any): void;
export function setClass(ids: any, className: any): void;
export function setLink(ids: any, linkStr: any, target: any): void;
export function getTooltip(id: any): any;
export function setClickEvent(ids: any, functionName: any, functionArgs: any): void;
export function bindFunctions(element: any): void;
export function getDirection(): any;
export function getVertices(): {} | any | any;
export function getEdges(): {} | any | any[];
export function getClasses(): {} | any | any;
export function clear(ver?: string): void;
export function setGen(ver: any): void;
export function defaultStyle(): string;
export function addSubGraph(_id: any, list: any, _title: any): any;
export function getDepthFirstPos(pos: any): any;
export function indexNodes(): void;
export function getSubGraphs(): any[];
export function firstGraph(): boolean;
declare namespace _default {
    export { parseDirective };
    export function defaultConfig(): import("../../config.type").FlowchartDiagramConfig | undefined;
    export { setAccTitle };
    export { getAccTitle };
    export { getAccDescription };
    export { setAccDescription };
    export { addVertex };
    export { lookUpDomId };
    export { addLink };
    export { updateLinkInterpolate };
    export { updateLink };
    export { addClass };
    export { setDirection };
    export { setClass };
    export { setTooltip };
    export { getTooltip };
    export { setClickEvent };
    export { setLink };
    export { bindFunctions };
    export { getDirection };
    export { getVertices };
    export { getEdges };
    export { getClasses };
    export { clear };
    export { setGen };
    export { defaultStyle };
    export { addSubGraph };
    export { getDepthFirstPos };
    export { indexNodes };
    export { getSubGraphs };
    export { destructLink };
    export namespace lex {
        export { firstGraph };
    }
    export { exists };
    export { makeUniq };
    export { setDiagramTitle };
    export { getDiagramTitle };
}
export default _default;
import { setAccTitle } from "../../commonDb";
import { getAccTitle } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
declare function setTooltip(ids: any, tooltip: any): void;
declare function destructLink(_str: any, _startStr: any): {
    type: string;
    stroke: string;
};
declare function exists(allSgs: any, _id: any): boolean;
/**
 * Deletes an id from all subgraphs
 *
 * @param sg
 * @param allSubgraphs
 */
declare function makeUniq(sg: any, allSubgraphs: any): {
    nodes: any[];
};
import { setDiagramTitle } from "../../commonDb";
import { getDiagramTitle } from "../../commonDb";
