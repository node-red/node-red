import { type ParseErrorFunction } from '../Diagram';
/** {@inheritDoc mermaidAPI.parse} */
declare function parse(text: string, parseError?: ParseErrorFunction): boolean;
export declare const mermaidAPI: {
    render: import("vitest/dist/index-9f5bc072").x<any[], any>;
    renderAsync: import("vitest/dist/index-9f5bc072").x<any[], any>;
    parse: typeof parse;
    parseDirective: import("vitest/dist/index-9f5bc072").x<any[], any>;
    initialize: import("vitest/dist/index-9f5bc072").x<any[], any>;
    getConfig: () => import("../config.type").MermaidConfig;
    setConfig: (conf: import("../config.type").MermaidConfig) => import("../config.type").MermaidConfig;
    getSiteConfig: () => import("../config.type").MermaidConfig;
    updateSiteConfig: (conf: import("../config.type").MermaidConfig) => import("../config.type").MermaidConfig;
    reset: () => void;
    globalReset: () => void;
    defaultConfig: import("../config.type").MermaidConfig;
};
export default mermaidAPI;
