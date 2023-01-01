export function addClasses(classes: {
    [x: string]: {
        cssClasses: string[];
        text: string;
        id: string;
        type: string;
        domId: string;
    };
}, g: SVGGElement, _id: any, diagObj: any): void;
export function addNotes(notes: {
    text: string;
    class: string;
    placement: number;
}[], g: SVGGElement, startEdgeId: number, classes: any): void;
export function addRelations(relations: any, g: object): void;
export function setConf(cnf: object): void;
export function draw(text: string, id: string, _version: any, diagObj: any): void;
declare namespace _default {
    export { setConf };
    export { draw };
}
export default _default;
