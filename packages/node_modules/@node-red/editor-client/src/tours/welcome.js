export default {
    version: "3.1.0",
    steps: [
        {
            titleIcon: "fa fa-map-o",
            title: {
                "en-US": "Welcome to Node-RED 3.1!",
                "ja": "Node-RED 3.1へようこそ!",
                "fr": "Bienvenue dans Node-RED 3.1!"
            },
            description: {
                "en-US": "<p>Let's take a moment to discover the new features in this release.</p>",
                "ja": "<p>本リリースの新機能を見つけてみましょう。</p>",
                "fr": "<p>Prenons un moment pour découvrir les nouvelles fonctionnalités de cette version.</p>"
            }
        },
        {
            title: {
                "en-US": "New ways to work with groups",
                "ja": "グループの新たな操作方法",
                "fr": "De nouvelles façons de travailler avec les groupes"
            },
            description: {
                "en-US": `<p>We have changed how you interact with groups in the editor.</p>
                <ul>
                    <li>They don't get in the way when clicking on a node</li>
                    <li>They can be reordered using the Moving Forwards and Move Backwards actions</li>
                    <li>Multiple nodes can be dragged into a group in one go</li>
                    <li>Holding <code>Alt</code> when dragging a node will *remove* it from its group</li>
                </ul>`,
                "ja": `<p>エディタ上のグループの操作が変更されました。</p>
                <ul>
                    <li>グループ内のノードをクリックする時に、グループが邪魔をすることが無くなりました。</li>
                    <li>「前面へ移動」と「背面へ移動」の動作を用いて、複数のグループの表示順序を変えることができます。</li>
                    <li>グループ内へ一度に複数のノードをドラッグできるようになりました。</li>
                    <li><code>Alt</code> を押したまま、グループ内のノードをドラッグすると、そのグループから *除く* ことができます。</li>
                </ul>`,
                "fr": `<p>Nous avons modifié la façon dont vous interagissez avec les groupes dans l'éditeur.</p>
                <ul>
                    <li>Ils ne gênent plus lorsque vous cliquez sur un noeud</li>
                    <li>Ils peuvent être réorganisés à l'aide des actions Avancer et Reculer</li>
                    <li>Plusieurs noeuds peuvent être glissés dans un groupe en une seule fois</li>
                    <li>Maintenir <code>Alt</code> lors du déplacement d'un noeud le *supprimera* de son groupe</li>
                </ul>`
            }
        },
        {
            title: {
                "en-US": "Change notification on tabs",
                "ja": "タブ上の変更通知",
                "fr": "Notification de changement sur les onglets"
            },
            image: 'images/tab-changes.png',
            description: {
                "en-US": `<p>When a tab contains undeployed changes it now shows the
                    same style of change icon used by nodes.</p>
                    <p>This will make it much easier to track down changes when you're
                    working across multiple flows.</p>`,
                "ja": `<p>タブ内にデプロイされていない変更が存在する時は、ノードと同じスタイルで変更の印が表示されるようになりました。</p>
                       <p>これによって複数のフローを編集している時に、変更を見つけるのが簡単になりました。</p>`,
                "fr": `<p>Lorsqu'un onglet contient des modifications non déployées, il affiche désormais le
                    même style d'icône de changement utilisé par les noeuds.</p>
                    <p>Cela facilitera grandement le suivi des modifications lorsque vous
                    travaillez sur plusieurs flux.</p>`
            }
        },
        {
            title: {
                "en-US": "A bigger canvas to work with",
                "ja": "より広くなった作業キャンバス",
                "fr": "Un canevas plus grand pour travailler"
            },
            description: {
                "en-US": `<p>The default canvas size has been increased so you can fit more
                into one flow.</p>
                <p>We still recommend using tools such as subflows and Link Nodes to help
                   keep things organised, but now you have more room to work in.</p>`,
                "ja": `<p>標準のキャンバスが広くなったため、1つのフローに沢山のものを含めることができるようになりました。</p>
                       <p>引き続き、サブフローやリンクノードなどの方法を用いて整理することをお勧めしますが、作業できる場所が増えました。</p>`,
                "fr": `<p>La taille par défaut du canevas a été augmentée pour que vous puissiez en mettre plus
                sur un seul flux.</p>
                <p>Nous recommandons toujours d'utiliser des outils tels que les sous-flux et les noeuds de lien pour vous aider
                   à garder les choses organisées, mais vous avez maintenant plus d'espace pour travailler.</p>`
            }
        },
        {
            title: {
                "en-US": "Finding help",
                "ja": "ヘルプを見つける",
                "fr": "Trouver de l'aide"
            },
            image: 'images/node-help.png',
            description: {
                "en-US": `<p>All node edit dialogs now include a link to that node's help
                in the footer.</p>
                <p>Clicking it will open up the Help sidebar showing the help for that node.</p>`,
                "ja": `<p>全てのノードの編集ダイアログの下に、ノードのヘルプへのリンクが追加されました。</p>
                       <p>これをクリックすると、ノードのヘルプサイドバーが表示されます。</p>`,
                "fr": `<p>Toutes les boîtes de dialogue d'édition de noeud incluent désormais un lien vers l'aide de ce noeud
                dans le pied de page.</p>
                <p>Cliquer dessus ouvrira la barre latérale d'aide affichant l'aide pour ce noeud.</p>`
            }
        },
        {
            title: {
                "en-US": "Improved Context Menu",
                "ja": "コンテキストメニューの改善",
                "fr": "Menu contextuel amélioré"
            },
            image: 'images/context-menu.png',
            description: {
                "en-US": `<p>The editor's context menu has been expanded to make lots more of
                        the built-in actions available.</p>
                        <p>Adding nodes, working with groups and plenty
                        of other useful tools are now just a click away.</p>
                        <p>The flow tab bar also has its own context menu to make working
                        with your flows much easier.</p>`,
                "ja": `<p>より多くの組み込み動作を利用できるように、エディタのコンテキストメニューが拡張されました。</p>
                       <p>ノードの追加、グループの操作、その他の便利なツールをクリックするだけで実行できるようになりました。</p>
                       <p>フローのタブバーには、フローの操作をより簡単にする独自のコンテキストメニューもあります。</p>`,
                "fr": `<p>Le menu contextuel de l'éditeur a été étendu pour faire beaucoup plus d'actions intégrées disponibles.</p>
                <p>Ajouter des noeuds, travailler avec des groupes et beaucoup d'autres outils utiles sont désormais à portée de clic.</p>
                <p>La barre d'onglets de flux possède également son propre menu contextuel pour faciliter l'utilisation de vos flux.</p>`
            }
        },
        {
            title: {
                "en-US": "Hiding Flows",
                "ja": "フローを非表示",
                "fr": "Masquage de flux"
            },
            image: 'images/hiding-flows.png',
            description: {
                "en-US": `<p>Hiding flows is now done through the flow context menu.</p>
                          <p>The 'hide' button in previous releases has been removed from the tabs
                             as they were being clicked accidentally too often.</p>`,
                "ja": `<p>フローを非表示にする機能は、フローのコンテキストメニューから実行するようになりました。</p>
                       <p>これまでのリリースでタブに存在していた「非表示」ボタンは、よく誤ってクリックされていたため、削除されました。</p>`,
                "fr": `<p>Le masquage des flux s'effectue désormais via le menu contextuel du flux.</p>
                <p>Le bouton "Masquer" des versions précédentes a été supprimé des onglets
                   car il était cliqué accidentellement trop souvent.</p>`
            },
        },
        {
            title: {
                "en-US": "Locking Flows",
                "ja": "フローを固定",
                "fr": "Verrouillage de flux"
            },
            image: 'images/locking-flows.png',
            description: {
                "en-US": `<p>Flows can now be locked to prevent accidental changes being made.</p>
                          <p>When locked you cannot modify the nodes in any way.</p>
                          <p>The flow context menu provides the options to lock and unlock flows,
                             as well as in the Info sidebar explorer.</p>`,
                "ja": `<p>誤ってフローに変更が加えられてしまうのを防ぐために、フローを固定できるようになりました。</p>
                       <p>固定されている時は、ノードを修正することはできません。</p>
                       <p>フローのコンテキストメニューと、情報サイドバーのエクスプローラには、フローの固定や解除をするためのオプションが用意されています。</p>`,
                "fr": `<p>Les flux peuvent désormais être verrouillés pour éviter toute modification accidentelle.</p>
                <p>Lorsqu'il est verrouillé, vous ne pouvez en aucun cas modifier les noeuds.</p>
                <p>Le menu contextuel du flux fournit les options pour verrouiller et déverrouiller les flux,
                   ainsi que dans l'explorateur de la barre latérale d'informations.</p>`
            },
        },
        {
            title: {
                "en-US": "Adding Images to node/flow descriptions",
                "ja": "ノードやフローの説明へ画像を追加",
                "fr": "Ajout d'images aux descriptions de noeud/flux"
            },
            // image: 'images/debug-path-tooltip.png',
            description: {
                "en-US": `<p>You can now add images to a node's or flows's description.</p>
                          <p>Simply drag the image into the text editor and it will get added inline.</p>
                          <p>When the description is shown in the Info sidebar, the image will be displayed.</p>`,
                "ja": `<p>ノードまたはフローの説明に、画像を追加できるようになりました。</p>
                       <p>画像をテキストエディタにドラッグするだけで、行内に埋め込まれます。</p>
                       <p>情報サイドバーの説明を開くと、その画像が表示されます。</p>`,
                "fr": `<p>Vous pouvez désormais ajouter des images à la description d'un noeud ou d'un flux.</p>
                <p>Faites simplement glisser l'image dans l'éditeur de texte et elle sera ajoutée en ligne.</p>
                <p>Lorsque la description s'affiche dans la barre latérale d'informations, l'image s'affiche.</p>`
            },
        },
        {
            title: {
                "en-US": "Adding Mermaid Diagrams",
                "ja": "Mermaid図を追加",
                "fr": "Ajout de diagrammes Mermaid"
            },
            image: 'images/mermaid.png',
            description: {
                "en-US": `<p>You can also add <a href="https://github.com/mermaid-js/mermaid">Mermaid</a> diagrams directly into your node or flow descriptions.</p>
                          <p>This gives you much richer options for documenting your flows.</p>`,
                "ja": `<p>ノードやフローの説明に、<a href="https://github.com/mermaid-js/mermaid">Mermaid</a>図を直接追加することもできます。</p>
                       <p>これによって、フローを説明する文書作成の選択肢がより多くなります。</p>`,
                "fr": `<p>Vous pouvez également ajouter des diagrammes <a href="https://github.com/mermaid-js/mermaid">Mermaid</a> directement dans vos descriptions de noeud ou de flux.</p>
                <p>Cela vous offre des options beaucoup plus riches pour documenter vos flux.</p>`
            },
        },
        {
            title: {
                "en-US": "Managing Global Environment Variables",
                "ja": "グローバル環境変数の管理",
                "fr": "Gestion des variables d'environnement globales"
            },
            image: 'images/global-env-vars.png',
            description: {
                "en-US": `<p>You can set environment variables that apply to all nodes and flows in the new
                          'Global Environment Variables' section of User Settings.</p>`,
                "ja": `<p>ユーザ設定に新しく追加された「大域環境変数」のセクションで、全てのノードとフローに適用される環境変数を登録できます。</p>`,
                "fr": `<p>Vous pouvez définir des variables d'environnement qui s'appliquent à tous les noeuds et flux dans la nouvelle
                section "Global Environment Variables" des paramètres utilisateur.</p>`
            },
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
                          small enhancements. Check the full changelog in the Help sidebar for a full list.</p>`,
                "ja": `<p>コアノードにマイナーな修正、ドキュメント更新、小規模な拡張が数多く追加されています。全ての一覧は、ヘルプサイドバーの全ての更新履歴を確認してください。</p>`,
                "fr": `<p>Les noeuds principaux ont reçu de nombreux correctifs mineurs, mises à jour de la documentation et
                petites améliorations. Consulter le journal des modifications complet dans la barre latérale d'aide.</p>`
            }
        }
    ]
}
