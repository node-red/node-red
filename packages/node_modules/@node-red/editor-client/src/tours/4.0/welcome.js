export default {
    version: "4.0.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 4.0!",
                "ja": "Node-RED 4.0 へようこそ!",
                "fr": "Bienvenue dans Node-RED 4.0!"
            },
            description: {
                "en-US": "<p>Let's take a moment to discover the new features in this release.</p>",
                "ja": "<p>本リリースの新機能を見つけてみましょう。</p>",
                "fr": "<p>Prenons un moment pour découvrir les nouvelles fonctionnalités de cette version.</p>"
            }
        },
        {
            title: {
                "en-US": "Multiplayer Mode",
                "ja": "複数ユーザ同時利用モード",
                "fr": "Mode Multi-utilisateur"
            },
            image: 'images/nr4-multiplayer-location.png',
            description: {
                "en-US": `<p>This release includes the first small steps towards making Node-RED easier
                to work with when you have multiple people editing flows at the same time.</p>
                <p>When this feature is enabled, you will now see who else has the editor open and some
                basic information on where they are in the editor.</p>
                <p>Check the release post for details on how to enable this feature in your settings file.</p>`,
                "ja": `<p>本リリースには、複数ユーザが同時にフローを編集する時に、Node-REDをより使いやすくするのための最初の微修正が入っています。</p>
                <p>本機能を有効にすると、誰がエディタを開いているか、その人がエディタ上のどこにいるかの基本的な情報が表示されます。</p>
                <p>設定ファイルで本機能を有効化する方法の詳細は、リリースの投稿を確認してください。</p>`,
                "fr": `<p>Cette version inclut les premières étapes visant à rendre Node-RED plus facile à utiliser
                lorsque plusieurs personnes modifient des flux en même temps.</p>
                <p>Lorsque cette fonctionnalité est activée, vous pourrez désormais voir si d’autres utilisateurs ont
                ouvert l'éditeur. Vous pourrez également savoir où ces utilisateurs se trouvent dans l'éditeur.</p>
                <p>Consultez la note de publication pour plus de détails sur la façon d'activer cette fonctionnalité
                dans votre fichier de paramètres.</p>`
            }
        },
        {
            title: {
                "en-US": "Better background deploy handling",
                "ja": "バックグラウンドのデプロイ処理の改善",
                "fr": "Meilleure gestion du déploiement en arrière-plan"
            },
            image: 'images/nr4-background-deploy.png',
            description: {
                "en-US": `<p>If another user deploys changes whilst you are editing, we now use a more discrete notification
                that doesn't stop you continuing your work - especially if they are being very productive and deploying lots
                of changes.</p>`,
                "ja": `他のユーザが変更をデプロイした時に、特に変更が多い生産的な編集作業を妨げないように通知するようになりました。`,
                "fr": `<p>Si un autre utilisateur déploie des modifications pendant que vous êtes en train de modifier, vous recevrez
                une notification plus discrète qu'auparavant qui ne vous empêche pas de continuer votre travail.</p>`
            }
        },
        {
            title: {
                "en-US": "Improved flow diffs",
                "ja": "フローの差分表示の改善",
                "fr": "Amélioration des différences de flux"
            },
            image: 'images/nr4-diff-update.png',
            description: {
                "en-US": `<p>When viewing changes made to a flow, Node-RED now distinguishes between nodes that have had configuration
                changes and those that have only been moved.<p>
                <p>When faced with a long list of changes to look at, this makes it much easier to focus on more significant items.</p>`,
                "ja": `<p>フローの変更内容を表示する時に、Node-REDは設定が変更されたノードと、移動されただけのノードを区別するようになりました。<p>
                <p>これによって、多くの変更内容を確認する際に、重要な項目に焦点を当てることができます。</p>`,
                "fr": `<p>Lors de l'affichage des modifications apportées à un flux, Node-RED fait désormais la distinction entre les
                noeuds qui ont changé de configuration et ceux qui ont seulement été déplacés.<p>
                <p>Face à une longue liste de changements à examiner, il est beaucoup plus facile de se concentrer sur les éléments les
                plus importants.</p>`
            }
        },
        {
            title: {
                "en-US": "Better Configuration Node UX",
                "ja": "設定ノードのUXが向上",
                "fr": "Meilleure expérience utilisateur du noeud de configuration"
            },
            image: 'images/nr4-config-select.png',
            description: {
                "en-US": `<p>The Configuration node selection UI has had a small update to have a dedicated 'add' button
                next to the select box.</p>
                <p>It's a small change, but should make it easier to work with your config nodes.</p>`,
                "ja": `<p>設定ノードを選択するUIが修正され、選択ボックスの隣に専用の「追加」ボタンが追加されました。</p>
                <p>微修正ですが設定ノードの操作が容易になります。</p>`,
                "fr": `<p>L'interface utilisateur de la sélection du noeud de configuration a fait l'objet d'une petite
                mise à jour afin de disposer d'un bouton « Ajouter » à côté de la zone de sélection.</p>
                <p>C'est un petit changement, mais cela devrait faciliter le travail avec vos noeuds de configuration.</p>`
            }
        },
        {
            title: {
                "en-US": "Timestamp formatting options",
                "ja": "タイムスタンプの形式の項目",
                "fr": "Options de formatage de l'horodatage"
            },
            image: 'images/nr4-timestamp-formatting.png',
            description: {
                "en-US": `<p>Nodes that let you set a timestamp now have options on what format that timestamp should be in.</p>
                <p>We're keeping it simple to begin with by providing three options:<p>
                <ul>
                    <li>Milliseconds since epoch - this is existing behaviour of the timestamp option</li>
                    <li>ISO 8601 - a common format used by many systems</li>
                    <li>JavaScript Date Object</li>
                </ul>`,
                "ja": `<p>タイムスタンプを設定するノードに、タイムスタンプの形式を指定できる項目が追加されました。</p>
                <p>次の3つの項目を追加したことで、簡単に選択できるようになりました:<p>
                <ul>
                    <li>エポックからのミリ秒 - 従来動作と同じになるタイムスタンプの項目</li>
                    <li>ISO 8601 - 多くのシステムで使用されている共通の形式</li>
                    <li>JavaScript日付オブジェクト</li>
                </ul>`,
                "fr": `<p>Les noeuds qui vous permettent de définir un horodatage disposent désormais d'options sur le format dans lequel cet horodatage peut être défini.</p>
                <p>Nous gardons les choses simples en proposant trois options :<p>
                <ul>
                    <li>Millisecondes depuis l'époque : il s'agit du comportement existant de l'option d'horodatage</li>
                    <li>ISO 8601 : un format commun utilisé par de nombreux systèmes</li>
                    <li>Objet Date JavaScript</li>
                </ul>`
            }
        },
        {
            title: {
                "en-US": "Auto-complete of flow/global and env types",
                "ja": "フロー/グローバル、環境変数の型の自動補完",
                "fr": "Saisie automatique des types de flux/global et env"
            },
            image: 'images/nr4-auto-complete.png',
            description: {
                "en-US": `<p>The <code>flow</code>/<code>global</code> context inputs and the <code>env</code> input
                now all include auto-complete suggestions based on the live state of your flows.</p>
                `,
                "ja": `<p><code>flow</code>/<code>global</code>コンテキストや<code>env</code>の入力を、現在のフローの状態をもとに自動補完で提案するようになりました。</p>
                `,
                "fr": `<p>Les entrées contextuelles <code>flow</code>/<code>global</code> et l'entrée <code>env</code>
                incluent désormais des suggestions de saisie semi-automatique basées sur l'état actuel de vos flux.</p>
                `,
            }
        },
        {
            title: {
                "en-US": "Config node customisation in Subflows",
                "ja": "サブフローでの設定ノードのカスタマイズ",
                "fr": "Personnalisation du noeud de configuration dans les sous-flux"
            },
            image: 'images/nr4-sf-config.png',
            description: {
                "en-US": `<p>Subflows can now be customised to allow each instance to use a different
                config node of a selected type.</p>
                <p>For example, each instance of a subflow that connects to an MQTT Broker and does some post-processing
                of the messages received can be pointed at a different broker.</p>
                `,
                "ja": `<p>サブフローをカスタマイズして、選択した型の異なる設定ノードを各インスタンスが使用できるようになりました。</p>
                <p>例えば、MQTTブローカへ接続し、メッセージ受信と後処理を行うサブフローの各インスタンスに異なるブローカを指定することも可能です。</p>
                `,
                "fr": `<p>Les sous-flux peuvent désormais être personnalisés pour permettre à chaque instance d'utiliser un
                noeud de configuration d'un type sélectionné.</p>
                <p>Par exemple, chaque instance d'un sous-flux qui se connecte à un courtier MQTT et effectue un post-traitement
                des messages reçus peut être pointée vers un autre courtier.</p>
                `
            }
        },
        {
            title: {
                "en-US": "Remembering palette state",
                "ja": "パレットの状態を維持",
                "fr": "Mémorisation de l'état de la palette"
            },
            description: {
                "en-US": `<p>The palette now remembers what categories you have hidden between reloads - as well as any
                filter you have applied.</p>`,
                "ja": `<p>パレット上で非表示にしたカテゴリや適用したフィルタが、リロードしても記憶されるようになりました。</p>`,
                "fr": `<p>La palette se souvient désormais des catégories que vous avez masquées entre les rechargements,
                ainsi que le filtre que vous avez appliqué.</p>`
            }
        },
        {
            title: {
                "en-US": "Plugins shown in the Palette Manager",
                "ja": "パレット管理にプラグインを表示",
                "fr": "Affichage des Plugins dans le gestionnaire de palettes"
            },
            image: 'images/nr4-plugins.png',
            description: {
                "en-US": `<p>The palette manager now shows any plugin modules you have installed, such as
                <code>node-red-debugger</code>. Previously they would only be shown if the plugins include
                nodes for the palette.</p>`,
                "ja": `<p>パレットの管理に <code>node-red-debugger</code> の様なインストールしたプラグインが表示されます。以前はプラグインにパレット向けのノードが含まれている時のみ表示されていました。</p>`,
                "fr": `<p>Le gestionnaire de palettes affiche désormais tous les plugins que vous avez installés,
                tels que <code>node-red-debugger</code>. Auparavant, ils n'étaient affichés que s'ils contenaient
                des noeuds pour la palette.</p>`
            }
        },
        {
            title: {
                "en-US": "Node Updates",
                "ja": "ノードの更新",
                "fr": "Mises à jour des noeuds"
            },
            // image: "images/",
            description: {
                "en-US": `<p>The core nodes have received lots of minor fixes, documentation updates and
                          small enhancements. Check the full changelog in the Help sidebar for a full list.</p>
                          <ul>
                            <li>A fully RFC4180 compliant CSV mode</li>
                            <li>Customisable headers on the WebSocket node</li>
                            <li>Split node now can operate on any message property</li>
                            <li>and lots more...</li>
                          </ul>`,
                "ja": `<p>コアノードには沢山の軽微な修正、ドキュメント更新、小さな機能拡張が入っています。全リストはヘルプサイドバーにある変更履歴を参照してください。</p>
                          <ul>
                            <li>RFC4180に完全に準拠したCSVモード</li>
                            <li>WebSocketノードのカスタマイズ可能なヘッダ</li>
                            <li>Splitノードは、メッセージプロパティで操作できるようになりました</li>
                            <li>他にも沢山あります...</li>
                          </ul>`,
                "fr": `<p>Les noeuds principaux ont reçu de nombreux correctifs mineurs ainsi que des améliorations. La documentation a été mise à jour.
                          Consultez le journal des modifications dans la barre latérale d'aide pour une liste complète. Ci-dessous, les changements les plus importants :</p>
                          <ul>
                            <li>Un mode CSV entièrement conforme à la norme RFC4180</li>
                            <li>En-têtes personnalisables pour le noeud WebSocket</li>
                            <li>Le noeud Split peut désormais fonctionner sur n'importe quelle propriété de message</li>
                            <li>Et bien plus encore...</li>
                          </ul>`
            }
        }
    ]
}
