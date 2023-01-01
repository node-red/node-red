export function parseDirective(statement: any, context: any, type: any): void;
declare namespace _default {
    export { RequirementType };
    export { RiskLevel };
    export { VerifyType };
    export { Relationships };
    export { parseDirective };
    export function getConfig(): any;
    export { addRequirement };
    export { getRequirements };
    export { setNewReqId };
    export { setNewReqText };
    export { setNewReqRisk };
    export { setNewReqVerifyMethod };
    export { setAccTitle };
    export { getAccTitle };
    export { setAccDescription };
    export { getAccDescription };
    export { addElement };
    export { getElements };
    export { setNewElementType };
    export { setNewElementDocRef };
    export { addRelationship };
    export { getRelationships };
    export { clear };
}
export default _default;
declare namespace RequirementType {
    const REQUIREMENT: string;
    const FUNCTIONAL_REQUIREMENT: string;
    const INTERFACE_REQUIREMENT: string;
    const PERFORMANCE_REQUIREMENT: string;
    const PHYSICAL_REQUIREMENT: string;
    const DESIGN_CONSTRAINT: string;
}
declare namespace RiskLevel {
    const LOW_RISK: string;
    const MED_RISK: string;
    const HIGH_RISK: string;
}
declare namespace VerifyType {
    const VERIFY_ANALYSIS: string;
    const VERIFY_DEMONSTRATION: string;
    const VERIFY_INSPECTION: string;
    const VERIFY_TEST: string;
}
declare namespace Relationships {
    const CONTAINS: string;
    const COPIES: string;
    const DERIVES: string;
    const SATISFIES: string;
    const VERIFIES: string;
    const REFINES: string;
    const TRACES: string;
}
declare function addRequirement(name: any, type: any): any;
declare function getRequirements(): {};
declare function setNewReqId(id: any): void;
declare function setNewReqText(text: any): void;
declare function setNewReqRisk(risk: any): void;
declare function setNewReqVerifyMethod(verifyMethod: any): void;
import { setAccTitle } from "../../commonDb";
import { getAccTitle } from "../../commonDb";
import { setAccDescription } from "../../commonDb";
import { getAccDescription } from "../../commonDb";
declare function addElement(name: any): any;
declare function getElements(): {};
declare function setNewElementType(type: any): void;
declare function setNewElementDocRef(docRef: any): void;
declare function addRelationship(type: any, src: any, dst: any): void;
declare function getRelationships(): any[];
declare function clear(): void;
