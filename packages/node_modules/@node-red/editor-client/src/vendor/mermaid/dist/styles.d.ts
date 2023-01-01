import { FlowChartStyleOptions } from './diagrams/flowchart/styles';
declare const getStyles: (type: string, userStyles: string, options: {
    fontFamily: string;
    fontSize: string;
    textColor: string;
    errorBkgColor: string;
    errorTextColor: string;
    lineColor: string;
} & FlowChartStyleOptions) => string;
export declare const addStylesForDiagram: (type: string, diagramTheme: unknown) => void;
export default getStyles;
