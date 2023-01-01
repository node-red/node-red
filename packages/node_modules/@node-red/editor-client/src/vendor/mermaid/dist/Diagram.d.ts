import { type DetailedError } from './utils';
export declare type ParseErrorFunction = (err: string | DetailedError, hash?: any) => void;
export declare class Diagram {
    txt: string;
    type: string;
    parser: any;
    renderer: any;
    db: import("./diagram-api/types").DiagramDb;
    private detectTypeFailed;
    constructor(txt: string, parseError?: ParseErrorFunction);
    parse(text: string, parseError?: ParseErrorFunction): boolean;
    handleError(error: unknown, parseError?: ParseErrorFunction): void;
    getParser(): any;
    getType(): string;
}
export declare const getDiagramFromText: (txt: string, parseError?: ParseErrorFunction) => Diagram | Promise<Diagram>;
export default Diagram;
