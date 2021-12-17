export default {
    version: "2.1.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 2.1!",
                "ja": "Node-RED 2.1へようこそ!"
        },
            description: {
                "en-US": "Let's take a moment to discover the new features in this release.",
                "ja": "本リリースの新機能を見つけてみましょう。"
            }
        },
        {
            title: {
                "en-US": "A new Tour Guide",
                "ja": "新しいツアーガイド"
            },
            description: {
                "en-US": "<p>First, as you've already found, we now have this tour of new features. We'll only show the tour the first time you open the editor for each new version of Node-RED.</p>" +
                         "<p>You can choose not to see this tour in the future by disabling it under the View tab of User Settings.</p>",
                "ja": "<p>最初に、既に見つけている様に、新機能の本ツアーがあります。本ツアーは、新バージョンのNode-REDフローエディタを初めて開いた時のみ表示されます。</p>" +
                      "<p>ユーザ設定の表示タブの中で、この機能を無効化することで、本ツアーを表示しないようにすることもできます。</p>"
            }
        },
        {
            title: {
                "en-US": "New Edit menu",
                "ja": "新しい編集メニュー"
            },
            prepare() {
                $("#red-ui-header-button-sidemenu").trigger("click");
                $("#menu-item-edit-menu").parent().addClass("open");
            },
            complete() {
                $("#menu-item-edit-menu").parent().removeClass("open");
            },
            element: "#menu-item-edit-menu-submenu",
            interactive: false,
            direction: "left",
            description: {
                "en-US": "<p>The main menu has been updated with a new 'Edit' section. This includes all of the familar options, like cut/paste and undo/redo.</p>" +
                         "<p>The menu now displays keyboard shortcuts for the options.</p>",
                "ja": "<p>メインメニューに「編集」セクションが追加されました。本セクションには、切り取り/貼り付けや、変更操作を戻す/やり直しの様な使い慣れたオプションが含まれています。</p>" +
                      "<p>本メニューには、オプションのためのキーボードショートカットも表示されるようになりました。</p>"
            }
        },
        {
            title: {
                "en-US": "Arranging nodes",
                "ja": "ノードの配置"
            },
            prepare() {
                $("#red-ui-header-button-sidemenu").trigger("click");
                $("#menu-item-arrange-menu").parent().addClass("open");
            },
            complete() {
                $("#menu-item-arrange-menu").parent().removeClass("open");
            },
            element: "#menu-item-arrange-menu-submenu",
            interactive: false,
            direction: "left",
            description: {
                "en-US": "<p>The new 'Arrange' section of the menu provides new options to help arrange your nodes. You can align them to a common edge, spread them out evenly or change their order.</p>",
                "ja": "<p>メニューの新しい「配置」セクションには、ノードの配置を助ける新しいオプションが提供されています。ノードの端を揃えたり、均等に配置したり、表示順序を変更したりできます。</p>"
            }
        },
        {
            title: {
                "en-US": "Hiding tabs",
                "ja": "タブの非表示"
            },
            element: "#red-ui-workspace-tabs > li.active",
            description: {
                "en-US": '<p>Tabs can now be hidden by clicking their <i class="fa fa-eye-slash"></i> icon.</p><p>The Info Sidebar will still list all of your tabs, and tell you which ones are currently hidden.',
                "ja": '<p><i class="fa fa-eye-slash"></i> アイコンをクリックすることで、タブを非表示にできます。</p><p>情報サイドバーには、全てのタブが一覧表示されており、現在非表示になっているタブを確認できます。'
            },
            interactive: false,
            prepare() {
                $("#red-ui-workspace-tabs > li.active .red-ui-tab-close").css("display","block");
            },
            complete() {
                $("#red-ui-workspace-tabs > li.active .red-ui-tab-close").css("display","");
            }
        },
        {
            title: {
                "en-US": "Tab menu",
                "ja": "タブメニュー"
            },
            element: "#red-ui-workspace-tabs-menu",
            description: {
                "en-US": "<p>The new tab menu also provides lots of new options for your tabs.</p>",
                "ja": "<p>新しいタブメニューには、タブに関する沢山の新しいオプションが提供されています。</p>"
            },
            interactive: false,
            direction: "left",
            prepare() {
                $("#red-ui-workspace > .red-ui-tabs > .red-ui-tabs-menu a").trigger("click");
            },
            complete() {
                $(document).trigger("click");
            }
        },
        {
            title: {
                "en-US": "Flow and Group level environment variables",
                "ja": "フローとグループの環境変数"
            },
            element: "#red-ui-workspace-tabs > li.active",
            interactive: false,
            description: {
                "en-US": "<p>Flows and Groups can now have their own environment variables that can be referenced by nodes inside them.</p>",
                "ja": "<p>フローとグループには、内部のノードから参照できる環境変数を設定できるようになりました。</p>"
            }
        },
        {
            prepare(done) {
                RED.editor.editFlow(RED.nodes.workspace(RED.workspaces.active()),"editor-tab-envProperties");
                setTimeout(done,700);
            },
            element: "#red-ui-tab-editor-tab-envProperties-link-button",
            description: {
                "en-US": "<p>Their edit dialogs have a new Environment Variables section.</p>",
                "ja": "<p>編集ダイアログに環境変数セクションが追加されました。</p>"
            }
        },
        {
            element: ".node-input-env-container-row",
            direction: "left",
            description: {
                "en-US": '<p>The environment variables are listed in this table and new ones can be added by clicking the <i class="fa fa-plus"></i> button.</p>',
                "ja": '<p>この表に環境変数が一覧表示されており、<i class="fa fa-plus"></i>ボタンをクリックすることで新しい変数を追加できます。</p>'
            },
            complete(done) {
                $("#node-dialog-cancel").trigger("click");
                setTimeout(done,500);
            }
        },
        {
            title: {
                "en-US": "Link Call node added",
                "ja": "Link Callノードを追加"
            },
            prepare(done) {
                this.paletteWasClosed = $("#red-ui-main-container").hasClass("red-ui-palette-closed");
                RED.actions.invoke("core:toggle-palette",true)
                $('[data-palette-type="link call"]')[0].scrollIntoView({block:"center"})
                setTimeout(done,100);
            },
            element: '[data-palette-type="link call"]',
            direction: "right",
            description: {
                "en-US": "<p>The <code>Link Call</code> node lets you call another flow that begins with a <code>Link In</code> node and get the result back when the message reaches a <code>Link Out</code> node.</p>",
                "ja": "<p><code>Link Call</code>ノードを用いることで、<code>Link In</code>ノードから始まるフローを呼び出し、<code>Link Out</code>ノードに到達した時に、結果を取得できます。</p>"
            }
        },
        {
            title: {
              "en-US": "MQTT nodes support dynamic connections",
              "ja": "MQTTノードが動的接続をサポート"
            },
            prepare(done) {
                $('[data-palette-type="mqtt out"]')[0].scrollIntoView({block:"center"})
                setTimeout(done,100);
            },
            element: '[data-palette-type="mqtt out"]',
            direction: "right",
            description: {
              "en-US": '<p>The <code>MQTT</code> nodes now support creating their connections and subscriptions dynamically.</p>',
              "ja": '<p><code>MQTT</code>ノードは、動的な接続や購読ができるようになりました。</p>'
            },
        },
        {
            title: {
                "en-US": "File nodes renamed",
                "ja": "ファイルノードの名前変更"
            },
            prepare(done) {
                $('[data-palette-type="file"]')[0].scrollIntoView({block:"center"});
                setTimeout(done,100);
            },
            complete() {
                if (this.paletteWasClosed) {
                    RED.actions.invoke("core:toggle-palette",false)
                }
            },
            element: '[data-palette-type="file"]',
            direction: "right",
            description: {
                "en-US": "<p>The file nodes have been renamed to make it clearer which node does what.</p>",
                "ja": "<p>fileノードの名前が変更され、どのノードが何を行うかが明確になりました。</p>"
            }
        },
        {
            title: {
                "en-US": "Deep copy option on Change node",
                "ja": "Changeノードのディープコピーオプション"
            },
            prepare(done) {
                var def = RED.nodes.getType('change');
                RED.editor.edit({id:"test",type:"change",rules:[{t:"set",p:"payload",pt:"msg", tot:"msg",to:"anotherProperty"}],_def:def, _:def._});
                setTimeout(done,700);
            },
            complete(done) {
                $("#node-dialog-cancel").trigger("click");
                setTimeout(done,500);
            },
            element: function() {
                return $(".node-input-rule-property-deepCopy").next();
            },
            description: {
                "en-US": "<p>The Set rule has a new option to create a deep copy of the value. This ensures a complete copy is made, rather than using a reference.</p>",
                "ja": "<p>値を代入に、値のディープコピーを作成するオプションが追加されました。これによって参照ではなく、完全なコピーが作成されます。</p>"
            }
        },
        {
            title: {
                "en-US": "And that's not all...",
                "ja": "これが全てではありません..."
            },
            description: {
                "en-US": "<p>There are many more smaller changes, including:</p><ul><li>Auto-complete suggestions in the <code>msg</code> TypedInput.</li><li>Support for <code>msg.resetTimeout</code> in the <code>Join</code> node.</li><li>Pushing messages to the front of the queue in the <code>Delay</code> node's rate limiting mode.</li><li>An optional second output on the <code>Delay</code> node for rate limited messages.</li></ul>",
                "ja": "<p>以下の様な小さな変更が沢山あります:</p><ul><li><code>msg</code> TypedInputの自動補完提案</li><li><code>Join</code>ノードで<code>msg.resetTimeout</code>のサポート</li><li><code>Delay</code>ノードの流量制御モードにおいて先頭メッセージをキューに追加</li><li><code>Delay</code>ノードで流量制限されたメッセージ向けの任意の2つ目の出力</li></ul>"
            }
        }
    ]
}
