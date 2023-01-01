declare namespace _default {
    export { ERMarkers };
    export { insertMarkers };
}
export default _default;
declare namespace ERMarkers {
    const ONLY_ONE_START: string;
    const ONLY_ONE_END: string;
    const ZERO_OR_ONE_START: string;
    const ZERO_OR_ONE_END: string;
    const ONE_OR_MORE_START: string;
    const ONE_OR_MORE_END: string;
    const ZERO_OR_MORE_START: string;
    const ZERO_OR_MORE_END: string;
}
/**
 * Put the markers into the svg DOM for later use with edge paths
 *
 * @param elem
 * @param conf
 */
declare function insertMarkers(elem: any, conf: any): void;
