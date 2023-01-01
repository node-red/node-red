export function getC4Type(): any;
export function setC4Type(c4TypeParam: any): void;
export function parseDirective(statement: any, context: any, type: any): void;
export function addRel(type: any, from: any, to: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addPersonOrSystem(typeC4Shape: any, alias: any, label: any, descr: any, sprite: any, tags: any, link: any): void;
export function addContainer(typeC4Shape: any, alias: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addComponent(typeC4Shape: any, alias: any, label: any, techn: any, descr: any, sprite: any, tags: any, link: any): void;
export function addPersonOrSystemBoundary(alias: any, label: any, type: any, tags: any, link: any): void;
export function addContainerBoundary(alias: any, label: any, type: any, tags: any, link: any): void;
export function addDeploymentNode(nodeType: any, alias: any, label: any, type: any, descr: any, sprite: any, tags: any, link: any): void;
export function popBoundaryParseStack(): void;
export function updateElStyle(typeC4Shape: any, elementName: any, bgColor: any, fontColor: any, borderColor: any, shadowing: any, shape: any, sprite: any, techn: any, legendText: any, legendSprite: any): void;
export function updateRelStyle(typeC4Shape: any, from: any, to: any, textColor: any, lineColor: any, offsetX: any, offsetY: any): void;
export function updateLayoutConfig(typeC4Shape: any, c4ShapeInRowParam: any, c4BoundaryInRowParam: any): void;
export function getC4ShapeInRow(): number;
export function getC4BoundaryInRow(): number;
export function getCurrentBoundaryParse(): string;
export function getParentBoundaryParse(): string;
export function getC4ShapeArray(parentBoundary: any): any[];
export function getC4Shape(alias: any): any;
export function getC4ShapeKeys(parentBoundary: any): string[];
export function getBoundarys(parentBoundary: any): {
    alias: string;
    label: {
        text: string;
    };
    type: {
        text: string;
    };
    tags: null;
    link: null;
    parentBoundary: string;
}[];
export function getRels(): any[];
export function getTitle(): string;
export function setWrap(wrapSetting: any): void;
export function autoWrap(): boolean;
export function clear(): void;
export namespace LINETYPE {
    const SOLID: number;
    const DOTTED: number;
    const NOTE: number;
    const SOLID_CROSS: number;
    const DOTTED_CROSS: number;
    const SOLID_OPEN: number;
    const DOTTED_OPEN: number;
    const LOOP_START: number;
    const LOOP_END: number;
    const ALT_START: number;
    const ALT_ELSE: number;
    const ALT_END: number;
    const OPT_START: number;
    const OPT_END: number;
    const ACTIVE_START: number;
    const ACTIVE_END: number;
    const PAR_START: number;
    const PAR_AND: number;
    const PAR_END: number;
    const RECT_START: number;
    const RECT_END: number;
    const SOLID_POINT: number;
    const DOTTED_POINT: number;
}
export namespace ARROWTYPE {
    const FILLED: number;
    const OPEN: number;
}
export namespace PLACEMENT {
    const LEFTOF: number;
    const RIGHTOF: number;
    const OVER: number;
}
export function setTitle(txt: any): void;
declare namespace _default {
    export { addPersonOrSystem };
    export { addPersonOrSystemBoundary };
    export { addContainer };
    export { addContainerBoundary };
    export { addComponent };
    export { addDeploymentNode };
    export { popBoundaryParseStack };
    export { addRel };
    export { updateElStyle };
    export { updateRelStyle };
    export { updateLayoutConfig };
    export { autoWrap };
    export { setWrap };
    export { getC4ShapeArray };
    export { getC4Shape };
    export { getC4ShapeKeys };
    export { getBoundarys };
    export { getCurrentBoundaryParse };
    export { getParentBoundaryParse };
    export { getRels };
    export { getTitle };
    export { getC4Type };
    export { getC4ShapeInRow };
    export { getC4BoundaryInRow };
    export { setAccTitle };
    export { getAccTitle };
    export { getAccDescription };
    export { setAccDescription };
    export { parseDirective };
    export function getConfig(): import("../../config.type").C4DiagramConfig | undefined;
    export { clear };
    export { LINETYPE };
    export { ARROWTYPE };
    export { PLACEMENT };
    export { setTitle };
    export { setC4Type };
}
export default _default;
import { setAccTitle } from "../../commonDb";
import { getAccTitle } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
