export default {
    version: "4.1.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 4.1!",
                "ja": "Node-RED 4.1 へようこそ!",
                "fr": "Bienvenue dans Node-RED 4.1!"
            },
            description: {
                "en-US": "<p>Let's take a moment to discover the new features in this release.</p>",
                "ja": "<p>本リリースの新機能を見つけてみましょう。</p>",
                "fr": "<p>Prenons un moment pour découvrir les nouvelles fonctionnalités de cette version.</p>"
            }
        },
        {
            title: {
                "en-US": "Update notifications",
                "ja": "更新の通知",
                "fr": "Notifications de mise à jour"
            },
            image: 'images/update-notification.png',
            description: {
                "en-US": `<p>Stay up to date with notifications when there is a new Node-RED version available, or updates to the nodes you have installed</p>`,
                "ja": `<p>新バージョンのNode-REDの提供や、インストールしたノードの更新があった時に、通知を受け取ることができます。</p>`,
                "fr": `<p>Désormais vous recevrez une notification lorsqu'une nouvelle version de Node-RED ou une nouvelle version relative à un des noeuds que vous avez installés est disponible</p>`
            }
        },
        {
            title: {
                "en-US": "Flow documentation",
                "ja": "フローのドキュメント",
                "fr": "Documentation des flux"
            },
            image: 'images/node-docs.png',
            description: {
                "en-US": `<p>Quickly see which nodes have additional documentation with the new documentation icon.</p>
                <p>Clicking on the icon opens up the Description tab of the node edit dialog.</p>`,
                "ja": `<p>ドキュメントアイコンによって、どのノードにドキュメントが追加されているかをすぐに確認できます。</p>
                <p>アイコンをクリックすると、ノード編集ダイアログの説明タブが開きます。</p>`,
                "fr": `<p>Voyez rapidement quels noeuds ont une documentation supplémentaire avec la nouvelle icône de documentation.</p>
                <p>Cliquer sur l'icône ouvre l'onglet Description de la boîte de dialogue d'édition du noeud.</p>`
            }
        },
        {
            title: {
                "en-US": "Palette Manager Improvements",
                "ja": "パレットの管理の改善",
                "fr": "Améliorations du Gestionnaire de Palettes"
            },
            description: {
                "en-US": `<p>There are lots of improvements to the palette manager:</p>
                <ul>
                    <li>Search results are sorted by downloads to help you find the most popular nodes</li>
                    <li>See which nodes have been deprecated by their author and are no longer recommended for use</li>
                    <li>Links to node documentation for the nodes you already have installed</li>
                </ul>`,
                "ja": `<p>パレットの管理に多くの改善が加えられました:</p>
                <ul>
                    <li>検索結果はダウンロード数順で並べられ、最も人気のあるノードを見つけやすくなりました。</li>
                    <li>作者によって非推奨とされ、利用が推奨されなくなったノードかを確認できるようになりました。</li>
                    <li>既にインストールされているノードに、ノードのドキュメントへのリンクが追加されました。</li>
                </ul>`,
                "fr": `<p>Le Gestionnaire de Palettes a bénéficié de nombreuses améliorations :</p>
                <ul>
                    <li>Les résultats de recherche sont triés par téléchargement pour vous aider à trouver les noeuds les plus populaires.</li>
                    <li>Indique les noeuds obsolètes par leur auteur et dont l'utilisation n'est plus recommandée.</li>
                    <li>Liens vers la documentation des noeuds déjà installés.</li>
                </ul>`
            }
        },
        {
            title: {
                "en-US": "Installing missing modules",
                "ja": "不足モジュールのインストール",
                "fr": "Installation des modules manquants"
            },
            image: 'images/missing-modules.png',
            description: {
                "en-US": `<p>Flows exported from Node-RED 4.1 now include information on what additional modules need to be installed.</p>
                <p>When importing a flow with this information, the editor will let you know what is missing and help to get them installed.</p>
                `,
                "ja": `<p>Node-RED 4.1から書き出したフローには、インストールが必要な追加モジュールの情報が含まれる様になりました。</p>
                <p>この情報を含むフローを読み込むと、エディタは不足しているモジュールを通知し、インストールを支援します。</p>
                `,
                "fr": `<p>Les flux exportés depuis Node-RED 4.1 incluent désormais des informations sur les modules supplémentaires à installer.</p>
                <p>Lors de l'importation d'un flux contenant ces informations, l'éditeur vous indiquera les modules manquants et vous aidera à les installer.</p>
                `
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
                            <li>Support for <code>node:</code> prefixed modules in the Function node</li>
                            <li>The ability to set a global timeout for Function nodes via the runtime settings</li>
                            <li>Better display of error objects in the Debug sidebar</li>
                            <li>and lots more...</li>
                          </ul>`,
                "ja": `<p>コアノードには沢山の軽微な修正、ドキュメント更新、小さな機能拡張が入っています。全リストはヘルプサイドバーにある変更履歴を参照してください。</p>
                          <ul>
                            <li>Functionノードで<code>node:</code>のプレフィックスモジュールをサポート</li>
                            <li>ランタイム設定からFunctionノードのグローバルタイムアウトを設定可能</li>
                            <li>デバッグサイドバーでのエラーオブジェクトの表示を改善</li>
                            <li>その他、多数...</li>
                          </ul>`,
                "fr": `<p>Les noeuds principaux ont bénéficié de nombreux correctifs mineurs, de mises à jour de documentation et d'améliorations mineures.
                       Consultez le journal complet des modifications dans la barre latérale d'aide pour une liste complète.</p>
                       <ul>
                          <li>Prise en charge des modules préfixés <code>node:</code> dans le noeud Fonction.</li>
                          <li>Possibilité de définir un délai d'expiration global pour les noeuds Fonction via les paramètres d'exécution.</li>
                          <li>Meilleur affichage des objets d'erreur dans la barre latérale de débogage.</li>
                          <li>Et bien plus encore...</li>
                       </ul>`
            }
        }
    ]
}
