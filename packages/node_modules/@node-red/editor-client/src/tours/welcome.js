export default {
    version: "3.0.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 3.0!",
                "ja": "Node-RED 3.0へようこそ!"
            },
            description: {
                "en-US": "<p>Let's take a moment to discover the new features in this release.</p>",
                "ja": "<p>本リリースの新機能を見つけてみましょう。</p>"
            }
        },
        {
            title: {
                "en-US": "Context Menu",
                "ja": "コンテキストメニュー"
            },
            image: 'images/context-menu.png',
            description: {
                "en-US": `<p>The editor now has its own context menu when you
                          right-click in the workspace.</p>
                          <p>This makes many of the built-in actions much easier
                          to access.</p>`,
                "ja": `<p>ワークスペースで右クリックすると、エディタに独自のコンテキストメニューが表示されるようになりました。</p>
                       <p>これによって多くの組み込み動作を、より簡単に利用できます。</p>`
            }
        },
        {
            title: {
                "en-US": "Wire Junctions",
                "ja": "分岐点をワイヤーに追加"
            },
            image: 'images/junction-slice.gif',
            description: {
                "en-US": `<p>To make it easier to route wires around your flows,
                             it is now possible to add junction nodes that give
                             you more control.</p>
                          <p>Junctions can be added to wires by holding both the Alt key and the Shift key
                          then click and drag the mouse across the wires.</p>`,
                "ja": `<p>フローのワイヤーの経路をより制御しやすくするために、分岐点ノードを追加できるようになりました。</p>
                       <p>Altキーとシフトキーを押しながらマウスをクリックし、ワイヤーを横切るようにドラッグすることで、分岐点を追加できます。</p>`
            },
        },
        {
            title: {
                "en-US": "Wire Junctions",
                "ja": "分岐点をワイヤーに追加"
            },
            image: 'images/junction-quick-add.png',
            description: {
                "en-US": `<p>Junctions can also be added using the quick-add dialog.</p>
                          <p>The dialog is opened by holding the Ctrl (or Cmd) key when
                             clicking in the workspace.</p>`,
                "ja": `<p>クイック追加ダイアログを用いて、分岐点を追加することもできます。</p>
                       <p>本ダイアログを開くには、Ctrl(またはCmd)キーを押しながら、ワークスペース上でクリックします。</p>`
            },
        },
        {
            title: {
                "en-US": "Debug Path Tooltip",
                "ja": "デバッグパスのツールチップ"
            },
            image: 'images/debug-path-tooltip.png',
            description: {
                "en-US": `<p>When hovering over a node name in the Debug sidebar, a
                             new tooltip shows the full location of the node.</p>
                          <p>This is useful when working with subflows, making it
                             much easier to identify exactly which node generated
                             the message.</p>
                          <p>Clicking on any item in the list will reveal it in
                             the workspace.</p>`,
                "ja": `<p>デバックサイドバー内のノード名の上にマウスカーソルを乗せると、新たにツールチップが表示され、ノードの場所が分かるようになっています。</p>
                       <p>これは、サブフローを用いる時に役立つ機能であり、メッセージがどのノードから出力されたかを正確に特定することが遥かに簡単になります。</p>
                       <p>本リスト内の要素をクリックすると、ワークスペース内にその要素が表示されます。</p>`
            },
        },
        {
            title: {
                "en-US": "Continuous Search",
                "ja": "連続した検索"
            },
            image: 'images/continuous-search.png',
            description: {
                "en-US": `<p>When searching for things in the editor, a new toolbar in
                             the workspace provides options to quickly jump between
                             the search results.</p>`,
                "ja": `<p>ワークスペース内の新しいツールバーにあるオプションによって、エディタ内を検索する際に、検索結果の間を素早く移動できます。</p>`
            },
        },
        {
            title: {
                "en-US": "New wiring actions",
                "ja": "新しいワイヤー操作"
            },
            image: "images/split-wire-with-links.gif",
            description: {
                "en-US": `<p>A new action has been added that will replace a wire with a pair of connected Link nodes:</p>
                          <ul>
                          <li><b><code>Split Wire With Link Nodes</code></b></li>
                          </ul>
                          <p>Actions can be accessed from the Action List in the main menu.</p>`,
                "ja": `<p>ワイヤーを、接続されたLinkノードのペアに置き換える動作が新たに追加されました:</p>
                       <ul>
                       <li><b><code>ワイヤーをlinkノードで分割</code></b></li>
                       </ul>
                       <p>本アクションは、メインメニュー内の動作一覧から呼び出せます。</p>`,
            },
        },
        {
            title: {
                "en-US": "Default node names",
                "ja": "標準ノードの名前"
            },
            // image: "images/",
            description: {
                "en-US": `<p>Some nodes have been updated to generate a unique name when
                             new instances are added to the workspace. This applies to
                             <code>Debug</code>, <code>Function</code> and <code>Link</code> nodes.</p>
                          <p>A new action has also been added to generate default names for the selected
                             nodes:</p>
                             <ul>
                             <li><b><code>Generate Node Names</code></b></li>
                             </ul><p>Actions can be accessed from the Action List in the main menu.</p>
                            `,
                "ja": `<p>一部のノードは、ワークスペース上に新インスタンスとして追加した際に、一意の名前を付けるよう変更されました。この変更は、<code>Debug</code>、<code>Function</code>、<code>Link</code>ノードに適用されています。</p>
                       <p>選択したノードに対して、標準の名前を生成する動作も新たに追加されました:</p>
                          <ul>
                          <li><b><code>ノード名を生成</code></b></li>
                          </ul><p>本アクションは、メインメニュー内の動作一覧から呼び出せます。</p>
                         `
            }
        },
        {
            title: {
                "en-US": "Node Updates",
                "ja": "ノードの更新"
            },
            // image: "images/",
            description: {
                "en-US": `<ul>
                            <li>The Debug node can be configured to count messages it receives</li>
                            <li>The Link Call node can use a message property to dynamically target the link it should call</li>
                            <li>The HTTP Request node can be preconfigured with HTTP headers</li>
                          </ul>`,
                "ja": `<ul>
                         <li>Debugノードは、受信したメッセージの数をカウントするよう設定できるようになりました。</li>
                         <li>Link Callノードは、メッセージのプロパティによって、呼び出し対象のlinkを動的に指定できるようになりました。</li>
                         <li>HTTP Requestノードは、HTTPヘッダを事前設定できるようになりました。</li>
                       </ul>`
            }
        }
    ]
}
