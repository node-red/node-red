const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const EDITOR_SRC = path.join(ROOT, "packages/node_modules/@node-red/editor-client/src");
const EDITOR_PUBLIC = path.join(ROOT, "packages/node_modules/@node-red/editor-client/public");
const EDITOR_VENDOR_SRC = path.join(EDITOR_SRC, "vendor");
const NODE_MODULES = path.join(ROOT, "node_modules");

const cleanBuild = [
    path.join(EDITOR_PUBLIC, "red"),
    path.join(EDITOR_PUBLIC, "index.html"),
    path.join(EDITOR_PUBLIC, "favicon.ico"),
    path.join(EDITOR_PUBLIC, "icons"),
    path.join(EDITOR_PUBLIC, "vendor"),
    path.join(EDITOR_PUBLIC, "types/node"),
    path.join(EDITOR_PUBLIC, "types/node-red")
];

const concatEditor = {
    dest: path.join(EDITOR_PUBLIC, "red/red.js"),
    separator: ";",
    src: [
        "jquery-addons.js",
        "red.js",
        "events.js",
        "hooks.js",
        "i18n.js",
        "settings.js",
        "user.js",
        "comms.js",
        "runtime.js",
        "multiplayer.js",
        "text/bidi.js",
        "text/format.js",
        "ui/state.js",
        "plugins.js",
        "nodes.js",
        "font-awesome.js",
        "history.js",
        "validators.js",
        "ui/utils.js",
        "ui/common/editableList.js",
        "ui/common/treeList.js",
        "ui/common/checkboxSet.js",
        "ui/common/menu.js",
        "ui/common/panels.js",
        "ui/common/popover.js",
        "ui/common/searchBox.js",
        "ui/common/tabs.js",
        "ui/common/stack.js",
        "ui/common/typedInput.js",
        "ui/common/toggleButton.js",
        "ui/common/autoComplete.js",
        "ui/actions.js",
        "ui/deploy.js",
        "ui/diagnostics.js",
        "ui/diff.js",
        "ui/keyboard.js",
        "ui/env-var.js",
        "ui/workspaces.js",
        "ui/statusBar.js",
        "ui/view.js",
        "ui/view-zoom-constants.js",
        "ui/view-zoom-animator.js",
        "ui/view-annotations.js",
        "ui/view-navigator.js",
        "ui/view-tools.js",
        "ui/sidebar.js",
        "ui/palette.js",
        "ui/tab-info.js",
        "ui/tab-info-outliner.js",
        "ui/tab-help.js",
        "ui/tab-config.js",
        "ui/tab-context.js",
        "ui/palette-editor.js",
        "ui/editor.js",
        "ui/editors/panes/*.js",
        "ui/editors/*.js",
        "ui/editors/code-editors/*.js",
        "ui/event-log.js",
        "ui/tray.js",
        "ui/clipboard.js",
        "ui/library.js",
        "ui/notifications.js",
        "ui/search.js",
        "ui/contextMenu.js",
        "ui/actionList.js",
        "ui/typeSearch.js",
        "ui/subflow.js",
        "ui/group.js",
        "ui/userSettings.js",
        "ui/projects/projects.js",
        "ui/projects/projectSettings.js",
        "ui/projects/projectUserSettings.js",
        "ui/projects/tab-versionControl.js",
        "ui/tour/*.js"
    ].map((p) => path.join(EDITOR_SRC, "js", p))
};

const concatVendor = [
    {
        dest: path.join(EDITOR_PUBLIC, "vendor/vendor.js"),
        separator: ";",
        src: [
            path.join(EDITOR_VENDOR_SRC, "jquery/js/jquery-3.7.1.min.js"),
            path.join(EDITOR_VENDOR_SRC, "jquery/js/jquery-migrate-3.5.2.min.js"),
            path.join(EDITOR_VENDOR_SRC, "jquery/js/jquery-ui-1.14.1.min.js"),
            path.join(EDITOR_VENDOR_SRC, "jquery/js/jquery.ui.touch-punch.min.js"),
            path.join(NODE_MODULES, "marked/marked.min.js"),
            path.join(NODE_MODULES, "dompurify/dist/purify.min.js"),
            path.join(EDITOR_VENDOR_SRC, "d3/d3.v3.min.js"),
            path.join(NODE_MODULES, "i18next/i18next.min.js"),
            path.join(NODE_MODULES, "i18next-http-backend/i18nextHttpBackend.min.js"),
            path.join(NODE_MODULES, "jquery-i18next/jquery-i18next.min.js"),
            path.join(NODE_MODULES, "jsonata/jsonata-es5.min.js"),
            path.join(EDITOR_VENDOR_SRC, "jsonata/formatter.js")
        ]
    },
    {
        dest: path.join(EDITOR_PUBLIC, "vendor/ace/worker-jsonata.js"),
        separator: ";",
        src: [
            path.join(NODE_MODULES, "jsonata/jsonata-es5.min.js"),
            path.join(EDITOR_VENDOR_SRC, "jsonata/worker-jsonata.js")
        ]
    },
    {
        dest: path.join(EDITOR_PUBLIC, "vendor/mermaid/mermaid.min.js"),
        separator: ";",
        src: [path.join(NODE_MODULES, "mermaid/dist/mermaid.min.js")]
    }
];

const minify = [
    {
        src: path.join(EDITOR_PUBLIC, "red/red.js"),
        dest: path.join(EDITOR_PUBLIC, "red/red.min.js")
    },
    {
        src: path.join(EDITOR_PUBLIC, "red/main.js"),
        dest: path.join(EDITOR_PUBLIC, "red/main.min.js")
    },
    {
        src: path.join(EDITOR_VENDOR_SRC, "jsonata/mode-jsonata.js"),
        dest: path.join(EDITOR_PUBLIC, "vendor/ace/mode-jsonata.js")
    },
    {
        src: path.join(EDITOR_VENDOR_SRC, "jsonata/snippets-jsonata.js"),
        dest: path.join(EDITOR_PUBLIC, "vendor/ace/snippets/jsonata.js")
    }
];

const sassBuild = {
    src: path.join(EDITOR_SRC, "sass/style.scss"),
    dest: path.join(EDITOR_PUBLIC, "red/style.min.css")
};

const copy = [
    {
        src: path.join(EDITOR_SRC, "js/main.js"),
        dest: path.join(EDITOR_PUBLIC, "red/main.js")
    },
    {
        src: path.join(EDITOR_SRC, "js/keymap.json"),
        dest: path.join(EDITOR_PUBLIC, "red/keymap.json")
    },
    {
        cwd: path.join(EDITOR_SRC, "images"),
        glob: "**",
        dest: path.join(EDITOR_PUBLIC, "red/images")
    },
    {
        cwd: EDITOR_VENDOR_SRC,
        glob: [
            "ace/**",
            "jquery/css/base/**",
            "font-awesome/**",
            "monaco/dist/**",
            "monaco/types/extraLibs.js",
            "monaco/style.css",
            "monaco/monaco-bootstrap.js"
        ],
        dest: path.join(EDITOR_PUBLIC, "vendor")
    },
    {
        cwd: EDITOR_SRC,
        glob: ["types/node/**/*.ts", "types/node-red/*.ts"],
        dest: EDITOR_PUBLIC
    },
    {
        src: path.join(EDITOR_SRC, "favicon.ico"),
        dest: path.join(EDITOR_PUBLIC, "favicon.ico")
    },
    {
        src: path.join(ROOT, "CHANGELOG.md"),
        dest: path.join(EDITOR_PUBLIC, "red/about")
    },
    {
        src: path.join(ROOT, "CHANGELOG.md"),
        dest: path.join(ROOT, "packages/node_modules/node-red/CHANGELOG.md")
    },
    {
        cwd: path.join(EDITOR_SRC, "ace/bin"),
        glob: "**",
        dest: path.join(EDITOR_PUBLIC, "vendor/ace")
    },
    {
        cwd: path.join(EDITOR_SRC, "tours"),
        glob: "**",
        dest: path.join(EDITOR_PUBLIC, "red/tours")
    }
];

const jsonlint = {
    messages: [
        path.join(ROOT, "packages/node_modules/@node-red/nodes/locales/**/*.json"),
        path.join(ROOT, "packages/node_modules/@node-red/editor-client/locales/**/*.json"),
        path.join(ROOT, "packages/node_modules/@node-red/runtime/locales/**/*.json")
    ],
    keymaps: [path.join(EDITOR_SRC, "js/keymap.json")]
};

const attachCopyright = {
    js: [
        path.join(EDITOR_PUBLIC, "red/red.min.js"),
        path.join(EDITOR_PUBLIC, "red/main.min.js")
    ],
    css: [path.join(EDITOR_PUBLIC, "red/style.min.css")]
};

module.exports = {
    ROOT,
    cleanBuild,
    concatEditor,
    concatVendor,
    minify,
    sassBuild,
    copy,
    jsonlint,
    attachCopyright
};
