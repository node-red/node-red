export function drawEdge(elem: any, path: any, relation: any, conf: any, diagObj: any): void;
export function drawClass(elem: SVGSVGElement, classDef: any, conf: any, diagObj: any): {
    id: any;
    label: any;
    width: number;
    height: number;
};
export function drawNote(elem: SVGSVGElement, note: {
    id: string;
    text: string;
    class: string;
}, conf: any, diagObj: any): {
    id: string;
    text: string;
    width: number;
    height: number;
};
export function parseMember(text: any): {
    displayText: string;
    cssStyle: string;
};
declare namespace _default {
    export { drawClass };
    export { drawEdge };
    export { drawNote };
    export { parseMember };
}
export default _default;
