export default {
    version: "2.2.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 2.2!",
                "ja": "Node-RED 2.2へようこそ!"
            },
            description: {
                "en-US": "Let's take a moment to discover the new features in this release.",
                "ja": "本リリースの新機能を見つけてみましょう。"
            }
        },
        {
            title: {
                "en-US": "Search history",
                "ja": "検索履歴"
            },
            description: {
                "en-US": "<p>The Search dialog now keeps a history of your searches, making it easier to go back to a previous search.</p>",
                "ja": "<p>検索ダイアログが検索履歴を保持するようになりました。これによって、過去の検索に戻りやすくなりました。</p>"
            },
            element: "#red-ui-search .red-ui-searchBox-form",
            prepare(done) {
                RED.search.show();
                setTimeout(done,400);
            },
            complete() {
                RED.search.hide();
            },
        },
        {
            title: {
                "en-US": "Remembering Zoom & Position",
                "ja": "拡大/縮小のレベルや位置を記憶"
            },
            description: {
                "en-US": "<p>The editor has new options to restore the zoom level and scroll position when reloading the editor.</p>",
                "ja": "<p>エディタを再読み込みした時に、拡大/縮小のレベルやスクロール位置を復元するための新しいオプションを利用できます。</p>"
            },
            element: function() { return $("#user-settings-view-store-position").parent()},
            prepare(done) {
                RED.actions.invoke("core:show-user-settings")
                setTimeout(done,400);
            },
            complete(done) {
                $("#node-dialog-ok").trigger("click");
                setTimeout(done,400);
            },
        },
        {
            title: {
                "en-US": "New wiring actions",
                "ja": "新しいワイヤー操作"
            },
            // image: "images/",
            description: {
                "en-US": `<p>A pair of new actions have been added to help with wiring nodes together:</p>
                          <ul>
                          <li><b><code>Wire Series Of Nodes</code></b> - adds a wire (if necessary) between each pair of nodes in the order they were selected.</li>
                          <li><b><code>Wire Node To Multiple</code></b> - wires the first node selected to all of the other selected nodes.</li>
                          </ul>
                          <p>Actions can be accessed from the Action List in the main menu.</p>`,
                "ja": `<p>ノード接続を支援する2つの新しい操作が追加されました:</p>
                       <ul>
                       <li><b><code>Wire Series Of Nodes</code></b> - ノードを選択した順序で、各ノードのペアの間にワイヤーを(必要に応じて)追加します。</li>
                       <li><b><code>Wire Node To Multiple</code></b> - 最初に選択したノードから、他の選択した全てのノードに対して、ワイヤーを追加します。</li>
                       </ul>
                       <p>メインメニュー内の動作一覧から、これらの操作を利用できます。</p>`
            },
        },
        {
            title: {
                "en-US": "Deleting nodes and reconnecting wires",
                "ja": "ノードの削除とワイヤーの再接続"
            },
            image: "2.2/images/delete-repair.gif",
            description: {
                "en-US": `<p>It is now possible to delete a selection of nodes and automatically repair the wiring behind them.</p>
                          <p>This is really useful if you want to remove a node from the middle of the flow.</p>
                          <p>Hold the Ctrl (or Cmd) key when you press Delete and the nodes will be gone and the wires repaired.</p>
                          `,
                "ja": `<p>選択したノードを削除した後、その背後にあるワイヤーを自動的に修復できるようになりました。</p>
                       <p>これは、フローの中からノードを削除する時に、とても便利に使えます。</p>
                       <p>Ctrl (またはCmd)キーを押しながらDeleteキーを押すと、ノードがなくなり、ワイヤーが修復されます。</p>
                       `
            }
        },
        {
            title: {
                "en-US": "Detaching nodes from a flow",
                "ja": "フローからノードの切り離し"
            },
            image: "2.2/images/detach-repair.gif",
            description: {
                "en-US": `<p>If you want to remove a node from a flow without deleting it,
                          you can use the <b><code>Detach Selected Nodes</code></b> action.</p>
                          <p>The nodes will be removed from their flow, the wiring repaired behind them, and then attached to the mouse
                          so you can drop them wherever you want in the workspace.</p>
                          <p>There isn't a default keyboard shortcut assigned for this new action, but
                          you can add your own via the Keyboard pane of the main Settings dialog.</p>`,
                "ja": `<p>ノードを削除することなく、フローからノードを除きたい場合は、<b><code>Detach Selected Nodes</code></b>操作を利用できます。</p>
                       <p>フローからノードが除かれた後、背後のワイヤーが修復され、ノードはマウスポインタにつながります。そのため、ワークスペースの好きな所にノードを配置できます。</p>
                       <p>この新しい操作に対して、デフォルトのキーボードショートカットは登録されていませんが、メイン設定ダイアログのキーボード設定から追加できます。</p>`
            }
        },
        {
            title: {
                "en-US": "More wiring tricks",
                "ja": "その他のワイヤー操作"
            },
            image: "2.2/images/slice.gif",
            description: {
                "en-US": `<p>A couple more wiring tricks to share.</p>
                          <p>You can now select multiple wires by holding the Ctrl (or Cmd) key
                          when clicking on a wire. This makes it easier to delete multiple wires in one go.</p>
                          <p>If you hold the Ctrl (or Cmd) key, then click and drag with the right-hand mouse button,
                          you can slice through wires to remove them.</p>`,
                "ja": `<p>その他のいくつかのワイヤー操作</p>
                       <p>Ctrl (またはCmd)キーを押しながらワイヤーをクリックすることで、複数のワイヤーを選択できるようになりました。これによって、複数のワイヤーを一度に削除することが簡単になりました。</p>
                       <p>Ctrl (またはCmd)キーを押しながら、マウスの右ボタンを用いてドラッグすると、ワイヤーを切って削除できます。</p>`
            }
        },
        {
            title: {
                "en-US": "Subflow Output Labels",
                "ja": "サブフローの出力ラベル"
            },
            image: "2.2/images/subflow-labels.png",
            description: {
                "en-US": "<p>If a subflow has labels set for its outputs, they now get shown on the ports within the subflow template view.</p>",
                "ja": "<p>サブフローの出力にラベルが設定されている場合、サブフローテンプレート画面内のポートにラベルが表示されるようになりました。</p>"
            },
        },
        {
            title: {
                "en-US": "Node Updates",
                "ja": "ノードの更新"
            },
            // image: "images/",
            description: {
                "en-US": `<ul>
                            <li>The JSON node will now handle parsing Buffer payloads</li>
                            <li>The TCP Client nodes support TLS connections</li>
                            <li>The WebSocket node allows you to specify a sub-protocol when connecting</li>
                          </ul>`,
                "ja": `<ul>
                         <li>JSONノードが、バッファ形式のペイロードを解析できるようになりました。</li>
                         <li>TCPクライアントノードが、TLS接続をサポートしました。</li>
                         <li>WebSocketノードで、接続時にサブプロトコルを指定できるようになりました。</li>
                       </ul>`
            }
        }
    ]
}
