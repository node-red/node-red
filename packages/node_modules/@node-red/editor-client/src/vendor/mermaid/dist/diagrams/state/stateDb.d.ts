/**
 *
 * @param item1
 * @param item2
 * @param relationTitle
 */
export function addRelationObjs(item1: any, item2: any, relationTitle: any): void;
export namespace lineType {
    const LINE: number;
    const DOTTED_LINE: number;
}
export namespace relationType {
    const AGGREGATION: number;
    const EXTENSION: number;
    const COMPOSITION: number;
    const DEPENDENCY: number;
}
export function parseDirective(statement: any, context: any, type: any): void;
export function addState(id: null | string, type?: null | string, doc?: null | string, descr?: null | string | string[], note?: null | string, classes?: null | string | string[], styles?: null | string | string[], textStyles?: null | string | string[]): void;
export function clear(saveCommon: any): void;
export function getState(id: any): any;
export function getStates(): {};
export function logDocuments(): void;
export function getRelations(): never[];
export function addRelation(item1: string | object, item2: string | object, title: string): void;
export function addDescription(id: any, descr: any): void;
export function cleanupLabel(label: any): any;
export function addStyleClass(id: string, styleAttributes?: string | null): void;
export function getClasses(): {} | any | {};
export function setCssClass(itemIds: string | string[], cssClassName: string): void;
export function setStyle(itemId: any, styleText: any): void;
export function setTextStyle(itemId: any, cssClassName: any): void;
declare namespace _default {
    export { parseDirective };
    export function getConfig(): import("../../config.type").StateDiagramConfig | undefined;
    export { addState };
    export { clear };
    export { getState };
    export { getStates };
    export { getRelations };
    export { getClasses };
    export { getDirection };
    export { addRelation };
    export { getDividerId };
    export { setDirection };
    export { cleanupLabel };
    export { lineType };
    export { relationType };
    export { logDocuments };
    export { getRootDoc };
    export { setRootDoc };
    export { getRootDocV2 };
    export { extract };
    export { trimColon };
    export { getAccTitle };
    export { setAccTitle };
    export { getAccDescription };
    export { setAccDescription };
    export { addStyleClass };
    export { setCssClass };
    export { addDescription };
    export { setDiagramTitle };
    export { getDiagramTitle };
}
export default _default;
declare function getDirection(): string;
declare function getDividerId(): string;
declare function setDirection(dir: any): void;
declare function getRootDoc(): any[];
declare function setRootDoc(o: any): void;
declare function getRootDocV2(): {
    id: string;
    doc: any[];
};
/**
 * Convert all of the statements (stmts) that were parsed into states and relationships.
 * This is done because a state diagram may have nested sections,
 * where each section is a 'document' and has its own set of statements.
 * Ex: the section within a fork has its own statements, and incoming and outgoing statements
 * refer to the fork as a whole (document).
 * See the parser grammar:  the definition of a document is a document then a 'line', where a line can be a statement.
 * This will push the statement into the the list of statements for the current document.
 *
 * @param _doc
 */
declare function extract(_doc: any): void;
declare function trimColon(str: any): any;
import { getAccTitle } from "../../commonDb";
import { setAccTitle } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
import { setDiagramTitle } from "../../commonDb";
import { getDiagramTitle } from "../../commonDb";
