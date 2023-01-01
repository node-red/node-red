export function parseDirective(statement: any, context: any, type: any): void;
export function addActor(id: any, name: any, description: any, type: any): void;
export function addMessage(idFrom: any, idTo: any, message: any, answer: any): void;
export function addSignal(idFrom: any, idTo: any, message: {
    text: undefined;
    wrap: undefined;
} | undefined, messageType: any): boolean;
export function getMessages(): any[];
export function getActors(): {};
export function getActor(id: any): any;
export function getActorKeys(): string[];
export function enableSequenceNumbers(): void;
export function disableSequenceNumbers(): void;
export function showSequenceNumbers(): boolean;
export function setWrap(wrapSetting: any): void;
export function autoWrap(): any;
export function clear(): void;
export function parseMessage(str: any): {
    text: any;
    wrap: boolean | undefined;
};
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
    const AUTONUMBER: number;
    const CRITICAL_START: number;
    const CRITICAL_OPTION: number;
    const CRITICAL_END: number;
    const BREAK_START: number;
    const BREAK_END: number;
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
export function addNote(actor: any, placement: any, message: any): void;
export function addLinks(actorId: any, text: any): void;
export function addALink(actorId: any, text: any): void;
export function addProperties(actorId: any, text: any): void;
export function addDetails(actorId: any, text: any): void;
export function getActorProperty(actor: any, key: any): any;
export function apply(param: any): void;
declare namespace _default {
    export { addActor };
    export { addMessage };
    export { addSignal };
    export { addLinks };
    export { addDetails };
    export { addProperties };
    export { autoWrap };
    export { setWrap };
    export { enableSequenceNumbers };
    export { disableSequenceNumbers };
    export { showSequenceNumbers };
    export { getMessages };
    export { getActors };
    export { getActor };
    export { getActorKeys };
    export { getActorProperty };
    export { getAccTitle };
    export { getDiagramTitle };
    export { setDiagramTitle };
    export { parseDirective };
    export function getConfig(): import("../../config.type").SequenceDiagramConfig | undefined;
    export { clear };
    export { parseMessage };
    export { LINETYPE };
    export { ARROWTYPE };
    export { PLACEMENT };
    export { addNote };
    export { setAccTitle };
    export { apply };
    export { setAccDescription };
    export { getAccDescription };
}
export default _default;
import { getAccTitle } from "../../commonDb";
import { getDiagramTitle } from "../../commonDb";
import { setDiagramTitle } from "../../commonDb";
import { setAccTitle } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
