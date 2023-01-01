export function parseDirective(statement: any, context: any, type: any): void;
export function clear(): void;
export function setAxisFormat(txt: any): void;
export function getAxisFormat(): string;
export function setTickInterval(txt: any): void;
export function getTickInterval(): any;
export function setTodayMarker(txt: any): void;
export function getTodayMarker(): string;
export function setDateFormat(txt: any): void;
export function enableInclusiveEndDates(): void;
export function endDatesAreInclusive(): boolean;
export function enableTopAxis(): void;
export function topAxisEnabled(): boolean;
export function getDateFormat(): string;
export function setIncludes(txt: any): void;
export function getIncludes(): any[];
export function setExcludes(txt: any): void;
export function getExcludes(): any[];
export function getLinks(): {};
export function addSection(txt: any): void;
export function getSections(): any[];
export function getTasks(): any[];
export function isInvalidDate(date: any, dateFormat: any, excludes: any, includes: any): any;
export function addTask(descr: any, data: any): void;
export function findTaskById(id: any): any;
export function addTaskOrg(descr: any, data: any): void;
export function setLink(ids: any, _linkStr: any): void;
export function setClass(ids: any, className: any): void;
export function setClickEvent(ids: any, functionName: any, functionArgs: any): void;
export function bindFunctions(element: any): void;
declare namespace _default {
    export { parseDirective };
    export function getConfig(): import("../../config.type").GanttDiagramConfig | undefined;
    export { clear };
    export { setDateFormat };
    export { getDateFormat };
    export { enableInclusiveEndDates };
    export { endDatesAreInclusive };
    export { enableTopAxis };
    export { topAxisEnabled };
    export { setAxisFormat };
    export { getAxisFormat };
    export { setTickInterval };
    export { getTickInterval };
    export { setTodayMarker };
    export { getTodayMarker };
    export { setAccTitle };
    export { getAccTitle };
    export { setDiagramTitle };
    export { getDiagramTitle };
    export { setAccDescription };
    export { getAccDescription };
    export { addSection };
    export { getSections };
    export { getTasks };
    export { addTask };
    export { findTaskById };
    export { addTaskOrg };
    export { setIncludes };
    export { getIncludes };
    export { setExcludes };
    export { getExcludes };
    export { setClickEvent };
    export { setLink };
    export { getLinks };
    export { bindFunctions };
    export { parseDuration };
    export { isInvalidDate };
}
export default _default;
import { setAccTitle } from "../../commonDb";
import { getAccTitle } from "../../commonDb";
import { setDiagramTitle } from "../../commonDb";
import { getDiagramTitle } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
/**
 * Parse a string as a moment duration.
 *
 * The string have to be compound by a value and a shorthand duration unit. For example `5d`
 * represents 5 days.
 *
 * Shorthand unit supported are:
 *
 * - `y` for years
 * - `M` for months
 * - `w` for weeks
 * - `d` for days
 * - `h` for hours
 * - `s` for seconds
 * - `ms` for milliseconds
 *
 * @param {string} str - A string representing the duration.
 * @returns {moment.Duration} A moment duration, including an invalid moment for invalid input
 *   string.
 */
declare function parseDuration(str: string): moment.Duration;
import moment from "moment-mini";
