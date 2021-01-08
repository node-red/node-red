function getSubflowType(subflow) {
    if (subflow.meta && subflow.meta.type) {
        return subflow.meta.type
    }
    return "sf:"+subflow.id
}

function generateSubflowConfig(subflow) {

    const subflowType = getSubflowType(subflow)
    const label = subflow.name || subflowType;
    const category = subflow.category || "function";
    const color = subflow.color || "#C0DEED";
    const inputCount = subflow.in?subflow.in.length:0;
    const outputCount = subflow.out?subflow.out.length:0;
    const icon = subflow.icon || "arrow-in.svg";

    const defaults = {
        name: {value: ""}
    }

    const credentials = {}

    if (subflow.env) {
        subflow.env.forEach(prop => {
            var defaultValue;

            switch(prop.type) {
                case "cred": defaultValue = ""; break;
                case "str": defaultValue = prop.value||""; break;
                case "bool": defaultValue = (typeof prop.value === 'boolean')?prop.value:prop.value === "true" ; break;
                case "num": defaultValue = (typeof prop.value === 'number')?prop.value:Number(prop.value); break;
                default:
                    defaultValue = {
                        type: prop.type,
                        value: prop.value||""
                    }
            }



            defaults[prop.name] = {
                value: defaultValue,
                ui: prop.ui
            }
            if (prop.type === 'cred') {
                defaults[prop.name].ui.type = "cred";
                credentials[prop.name] = {type:"password"}
            }
        })
    }
    const defaultString = JSON.stringify(defaults);
    const credentialsString = JSON.stringify(credentials);

    let nodeHelp = "";
    if (subflow.info) {
        nodeHelp = `<script type="text/markdown" data-help-name="${subflowType}">${subflow.info}</script>`
    }

    return `<script type="text/javascript">
    RED.nodes.registerType("${subflowType}",{
        subflowModule: true,
        category: "${category}",
        color: "${color}",
        defaults: ${defaultString},
        credentials: ${credentialsString},
        inputs:${inputCount},
        outputs:${outputCount},
        icon: "${icon}",
        paletteLabel: "${label}",
        label: function() {
            return this.name||"${label}";
        },
        labelStyle: function() {
            return this.name?"node_label_italic":"";
        },
        oneditprepare: function() {
            RED.subflow.buildEditForm('subflow', this);
        },
        oneditsave: function() {
            var props = RED.subflow.exportSubflowInstanceEnv(this);
            var i=0,l=props.length;
            for (;i<l;i++) {
                var prop = props[i];
                if (this._def.defaults[prop.name].ui && this._def.defaults[prop.name].ui.type === "cred") {
                    this[prop.name] = "";
                    this.credentials[prop.name] = prop.value || "";
                    this.credentials['has_' + prop.name] = (this.credentials[prop.name] !== "");
                } else {
                    switch(prop.type) {
                        case "str": this[prop.name] = prop.value||""; break;
                        case "bool": this[prop.name] = (typeof prop.value === 'boolean')?prop.value:prop.value === "true" ; break;
                        case "num": this[prop.name] = (typeof prop.value === 'number')?prop.value:Number(prop.value); break;
                        default:
                            this[prop.name] = {
                                type: prop.type,
                                value: prop.value||""
                            }
                    }
                }
            }
        }
    });
</script>
<script type="text/x-red" data-template-name="${subflowType}">
    <div class="form-row">
        <label for="node-input-name" data-i18n="[append]editor:common.label.name"><i class="fa fa-tag"></i> </label>
        <input type="text" id="node-input-name" data-i18n="[placeholder]editor:common.label.name">
    </div>
    <div id="subflow-input-ui"></div>
</script>
${nodeHelp}
`
}


function register(id,subflow) {
    return {
        subflow: subflow,
        type: getSubflowType(subflow),
        config: generateSubflowConfig(subflow)
    }
}

module.exports = {
    register: register
}