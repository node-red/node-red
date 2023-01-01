declare namespace _default {
    export namespace base {
        export { baseThemeVariables as getThemeVariables };
    }
    export namespace dark {
        export { darkThemeVariables as getThemeVariables };
    }
    namespace _default {
        export { defaultThemeVariables as getThemeVariables };
    }
    export { _default as default };
    export namespace forest {
        export { forestThemeVariables as getThemeVariables };
    }
    export namespace neutral {
        export { neutralThemeVariables as getThemeVariables };
    }
}
export default _default;
import { getThemeVariables as baseThemeVariables } from "./theme-base";
import { getThemeVariables as darkThemeVariables } from "./theme-dark";
import { getThemeVariables as defaultThemeVariables } from "./theme-default";
import { getThemeVariables as forestThemeVariables } from "./theme-forest";
import { getThemeVariables as neutralThemeVariables } from "./theme-neutral";
