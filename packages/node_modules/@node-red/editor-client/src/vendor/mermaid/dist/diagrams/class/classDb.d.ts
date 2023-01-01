export function parseDirective(statement: any, context: any, type: any): void;
export function addClass(id: any): void;
export function lookUpDomId(id: any): any;
export function clear(): void;
export function getClass(id: any): any;
export function getClasses(): {};
export function getRelations(): any[];
export function getNotes(): any[];
export function addRelation(relation: any): void;
export function addAnnotation(className: any, annotation: any): void;
export function addMember(className: any, member: any): void;
export function addMembers(className: any, members: any): void;
export function addNote(text: any, className: any): void;
export function cleanupLabel(label: any): string;
export function setCssClass(ids: any, className: any): void;
export function getTooltip(id: any): any;
export function setLink(ids: any, linkStr: any, target: any): void;
export function setClickEvent(ids: any, functionName: any, functionArgs: any): void;
export function bindFunctions(element: any): void;
export namespace lineType {
    const LINE: number;
    const DOTTED_LINE: number;
}
export namespace relationType {
    const AGGREGATION: number;
    const EXTENSION: number;
    const COMPOSITION: number;
    const DEPENDENCY: number;
    const LOLLIPOP: number;
}
declare namespace _default {
    export { parseDirective };
    export { setAccTitle };
    export { getAccTitle };
    export { getAccDescription };
    export { setAccDescription };
    export function getConfig(): import("../../config.type").ClassDiagramConfig | undefined;
    export { addClass };
    export { bindFunctions };
    export { clear };
    export { getClass };
    export { getClasses };
    export { getNotes };
    export { addAnnotation };
    export { addNote };
    export { getRelations };
    export { addRelation };
    export { getDirection };
    export { setDirection };
    export { addMember };
    export { addMembers };
    export { cleanupLabel };
    export { lineType };
    export { relationType };
    export { setClickEvent };
    export { setCssClass };
    export { setLink };
    export { getTooltip };
    export { setTooltip };
    export { lookUpDomId };
    export { setDiagramTitle };
    export { getDiagramTitle };
}
export default _default;
import { setAccTitle } from "../../commonDb";
import { getAccTitle } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
declare function getDirection(): string;
declare function setDirection(dir: any): void;
/**
 * Called by parser when a tooltip is found, e.g. a clickable element.
 *
 * @param ids Comma separated list of ids
 * @param tooltip Tooltip to add
 */
declare function setTooltip(ids: any, tooltip: any): void;
import { setDiagramTitle } from "../../commonDb";
import { getDiagramTitle } from "../../commonDb";
