/**
 * Merges the value of `conf` with the passed `cnf`
 *
 * @param cnf - Config to merge
 */
export declare const setConf: (cnf: any) => void;
/**
 * Draws a an info picture in the tag with id: id based on the graph definition in text.
 *
 * @param _text - Mermaid graph definition.
 * @param id - The text for the error
 * @param mermaidVersion - The version
 */
export declare const draw: (_text: string, id: string, mermaidVersion: string) => void;
declare const _default: {
    setConf: (cnf: any) => void;
    draw: (_text: string, id: string, mermaidVersion: string) => void;
};
export default _default;
