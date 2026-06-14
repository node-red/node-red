export default {
    version: "5.0.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 5.0!",
                "ja": "Node-RED 5.0 へようこそ!",
                "fr": "Bienvenue dans Node-RED 5.0!"
            },
            description: {
                "en-US": "<p>Let's take a moment to discover some of the new features in this release.</p>",
                "ja": "<p>本リリースの新機能を見つけてみましょう。</p>",
                "fr": "<p>Prenons un moment pour découvrir les nouvelles fonctionnalités de cette version.</p>"
            }
        },
        {
            title: {
                "en-US": "A new editor experience",
                "ja": "新しいエディタ体験",
                "fr": "Une nouvelle expérience utilisateur"
            },
            description: {
                "en-US": `<p>The Node-RED editor just got a redesign: cleaner, more flexible, more yours. Resize, collapse, and rearrange the sidebar panels to match your workflow.</p>
                `,
                "ja": `<p>Node-REDエディタが再設計されました。より明確で、柔軟で、パーソナライズされました。ワークフローに合わせてサイドバーのパネルのサイズ変更、折りたたみ、再配置ができます。</p>
                `,
                "fr": `<p>L’éditeur Node-RED a été repensé : plus épuré, plus flexible et davantage personnalisable. Redimensionnez, repliez et réorganisez les panneaux de la barre latérale pour les adapter à votre façon de travailler.</p>
                `
            }
        },
        {
            title: {
                "en-US": "Explorer sidebar",
                "ja": "エクスプローラーサイドバー",
                "fr": "Barre latérale Explorateur"
            },
            description: {
                "en-US": `<p>The Information sidebar is now two panels. Use the explorer panel to browse your flows.</p>`,
                "ja": `<p>情報サイドバーは2つのパネルになりました。エクスプローラーパネルでフローを参照できます。</p>`,
                "fr": `<p>La barre latérale Informations est désormais divisée en deux panneaux. Utilisez le panneau Explorateur pour parcourir vos flux.</p>`
            },
            element: ".red-ui-info-outline",
            interactive: false,
            prepare() {
                RED.actions.invoke("core:show-explorer-tab")
            }
        },
        {
            title: {
                "en-US": "Information sidebar",
                "ja": "情報サイドバー",
                "fr": "Barre latérale Informations"
            },
            description: {
                "en-US": `<p>The Information sidebar shows details of whatever you select in the workspace. If an item includes documentation, you'll see it here.</p>`,
                "ja": `<p>情報サイドバーには、ワークスペースで選択した項目の詳細が表示されます。項目に説明が含まれている場合、ここに表示されます。</p>`,
                "fr": `<p>La barre latérale Informations affiche les détails de l’élément sélectionné dans l’espace de travail. Si cet élément dispose d’une documentation, elle apparaîtra ici.</p>`
            },
            element: ".red-ui-sidebar-info",
            direction: "left",
            interactive: false,
            prepare() {
                RED.actions.invoke("core:show-info-tab")
            }
        },
        {
            title: {
                "en-US": "Node documentation icon",
                "ja": "ノードの説明のアイコン",
                "fr": "Icône de documentation des noeuds"
            },
            description: {
                "en-US": `<p>Nodes with extra documentation now show a docs icon. Click it to open the docs in a pop-up.</p>`,
                "ja": `<p>説明が追加されているノードには、説明アイコンが表示されるようになりました。クリックすると、ポップアップで説明が表示されます。</p>`,
                "fr": `<p>Les noeuds disposant d’une documentation supplémentaire affichent désormais une icône de documentation. Cliquez dessus pour ouvrir la documentation dans une fenêtre contextuelle.</p>`
            },
            image: 'images/editor-node-docs.png',
        },
        {
            title: {
                "en-US": "Palette sidebar",
                "ja": "パレットサイドバー",
                "fr": "Barre latérale Palette"
            },
            description: {
                "en-US": `<p>The Palette is now a sidebar panel you can move to any other sidebar section.</p>`,
                "ja": `<p>パレットは他のサイドバーの区画に移動できるサイドバーパネルになりました。</p>`,
                "fr": `<p>La palette est désormais un panneau de barre latérale que vous pouvez déplacer vers n’importe quelle autre section de la barre latérale.</p>`
            },
            element: "#red-ui-palette-container",
            interactive: false,
            prepare() {
                RED.actions.invoke("core:show-palette-tab")
            }
        },
        {
            title: {
                "en-US": "Sidebar toolbar",
                "ja": "サイドバーツールバー",
                "fr": "Barre d’outils de la barre latérale"
            },
            description: {
                "en-US": `<p>Open any panel from the sidebar toolbar, including toggles to show or hide the sidebars entirely.</p>`,
                "ja": `<p>サイドバーのツールバーから任意のパネルを開くことができます。サイドバー全体を表示または非表示に切り替えることもできます。</p>`,
                "fr": `<p>Ouvrez n’importe quel panneau depuis la barre d’outils latérale, y compris les options permettant d’afficher ou de masquer complètement les barres latérales.</p>`
            },
            element: ".red-ui-sidebar-tab-bar > div",
            interactive: false
        },
        {
            title: {
                "en-US": "Dark theme unlocked",
                "ja": "ダークテーマを追加",
                "fr": "Thème sombre disponible"
            },
            description: {
                "en-US": `<p>Dark theme is now available with no need to enable it in settings.</p>
                          <p>This option may not be available if you have already installed a custom theme plugin.</p>`,
                "ja": `<p>個別設定で有効にすることなく利用できるダークテーマが追加されました。</p>
                       <p>既にカスタムテーマプラグインをインストールしている場合、このオプションは利用できない場合があります。</p>`,
                "fr": `<p>Le thème sombre est désormais disponible sans avoir besoin de l’activer dans les paramètres.</p>
                        <p>Cette option peut ne pas être disponible si vous avez déjà installé un plugin de thème personnalisé.</p>`
            },
            element() {
                const themeSelector = $("#user-settings-view-dark-theme");
                if (themeSelector.length === 0) {
                    return $("#red-ui-tab-red-ui-settings-tab-view")
                }
                return themeSelector
            },
            interactive: false,
            prepare(done) {
                RED.actions.invoke('core:show-user-settings')
                setTimeout(done, 300);
            },
            complete() {
                $("#node-dialog-ok").trigger("click")
            }
        },
        {
            title: {
                "en-US": "Search toolbar",
                "ja": "検索ツールバー",
                "fr": "Barre d’outils de recherche"
            },
            description: {
                "en-US": `<p>Search your workspace to find nodes and flows quickly without disrupting your workflow.</p>`,
                "ja": `<p>ワークスペース内を検索して、ワークフローを止めることなくノードやフローを素早く見つけることができます。</p>`,
                "fr": `<p>Recherchez dans votre espace de travail pour trouver rapidement des noeuds et des flows sans interrompre votre travail.</p>`
            },
            element: "#red-ui-view-searchtools-search",
            interactive: false,
            image: 'images/editor-search-toolbar.png',
        },
        {
            title: {
                "en-US": "Pausing debug",
                "ja": "デバッグの一時停止",
                "fr": "Mise en pause du débogage"
            },
            description: {
                "en-US": `<p>Pause the Debug sidebar's output when a busy flow is flooding you with messages.</p>`,
                "ja": `<p>フローが大量のメッセージを送信してくる場合に、デバッグサイドバーの出力を一時停止できます。</p>`,
                "fr": `<p>Mettez en pause les messages de la barre latérale Debug lorsqu’un flux très actif génère un grand nombre de messages.</p>`
            },
            prepare() {
                RED.actions.invoke("core:show-debug-tab")
            },
            element: "#red-ui-sidebar-debug-pause",
            interactive: false
        },
        {
            titleIcon: "fa fa-check",
            title: {
                "en-US": "You're all set",
                "ja": "準備完了です",
                "fr": "Tout est prêt"
            },
            description: {
                "en-US": `<p style="text-align: center">Now go build something amazing!</p>`,
                "ja": `<p style="text-align: center">さあ、素晴らしいものを作りましょう！</p>`,
                "fr": `<p style="text-align: center">Il ne vous reste plus qu’à créer quelque chose d’extraordinaire&nbsp;!</p>`
            }
        }
    ]
}
