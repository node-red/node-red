/**
 * Create a standard string for the dom ID of an item.
 * If a type is given, insert that before the counter, preceded by the type spacer
 *
 * @param itemId
 * @param counter
 * @param {string | null} type
 * @param typeSpacer
 * @returns {string}
 */
export function stateDomId(itemId?: string, counter?: number, type?: string | null, typeSpacer?: string): string;
export function setConf(cnf: any): void;
export function getClasses(text: string, diagramObj: any): object;
export function draw(text: any, id: any, _version: any, diag: any): void;
declare namespace _default {
    export { setConf };
    export { getClasses };
    export { draw };
}
export default _default;
