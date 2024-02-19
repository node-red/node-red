export default {
    steps: [
        {
            title: {
                'en-US': 'Create your first flow',
                'ja': 'はじめてのフローを作成',
                'fr': "Créer votre premier flux"
            },
            width: 400,
            description: {
                'en-US': 'This tutorial will guide you through creating your first flow',
                'ja': '本チュートリアルでは、はじめてのフローを作成する方法について説明します。',
                'fr': "Ce didacticiel vous guidera dans la création de votre premier flux"
            },
            nextButton: 'start'
        },
        {
            element: "#red-ui-workspace .red-ui-tab-button.red-ui-tabs-add",
            description: {
                'en-US': 'To add a new tab, click the <i class="fa fa-plus"></i> button',
                'ja': '新しいタブを追加するため、 <i class="fa fa-plus"></i> ボタンをクリックします。',
                'fr': 'Pour ajouter un nouvel onglet, cliquez sur le bouton <i class="fa fa-plus"></i>'
            },
            wait: {
                type: "dom-event",
                event: "click",
                element: "#red-ui-workspace .red-ui-tab-button.red-ui-tabs-add a"
            },
        },
        {
            element: '.red-ui-palette-node[data-palette-type="inject"]',
            direction: 'right',
            description: {
                'en-US': 'The palette lists all of the nodes available to use. Drag a new Inject node into the workspace.',
                'ja': 'パレットには、利用できる全てのノードが一覧表示されます。injectノードをワークスペースにドラッグします。',
                'fr': "La palette répertorie tous les noeuds disponibles à utiliser. Faites glisser un nouveau noeud Inject dans l'espace de travail."
            },
            fallback: 'inset-bottom-right',
            wait: {
                type: "nr-event",
                event: "nodes:add",
                filter: function(event) {
                    if (event.type === "inject") {
                        this.injectNode = event;
                        return true;
                    }
                    return false
                }
            },
            complete: function() {
                $('.red-ui-palette-node[data-palette-type="inject"]').css("z-index","auto");
            }
        },
        {
            element: '.red-ui-palette-node[data-palette-type="debug"]',
            direction: 'right',
            description: {
                'en-US': 'Next, drag a new Debug node into the workspace.',
                'ja': '次に、debugノードをワークスペースにドラッグします。',
                'fr': "Ensuite, faites glisser un nouveau noeud Debug dans l'espace de travail."
            },
            fallback: 'inset-bottom-right',
            wait: {
                type: "nr-event",
                event: "nodes:add",
                filter: function(event) {
                    if (event.type === "debug") {
                        this.debugNode = event;
                        return true;
                    }
                    return false
                }
            },
            complete: function() {
                $('.red-ui-palette-node[data-palette-type="debug"]').css("z-index","auto");
            },
        },
        {
            element: function() { return $("#"+this.injectNode.id+" .red-ui-flow-port") },
            description: {
                'en-US': 'Add a wire from the output of the Inject node to the input of the Debug node',
                'ja': 'injectノードの出力から、debugノードの入力へワイヤーで接続します。',
                'fr': "Ajoutez un fil de la sortie du noeud Inject à l'entrée du noeud Debug"
            },
            fallback: 'inset-bottom-right',
            wait: {
                type: "nr-event",
                event: "links:add",
                filter: function(event) {
                    return  event.source.id === this.injectNode.id && event.target.id === this.debugNode.id;
                }
            },
        },
        {
            element: "#red-ui-header-button-deploy",
            description: {
                'en-US': 'Deploy your changes so the flow is active in the runtime',
                'ja': 'フローをランタイムで実行させるため、変更をデプロイします。',
                'fr': "Déployez vos modifications afin que le flux soit actif dans le runtime"
            },
            width: 200,
            wait: {
                type: "dom-event",
                event: "click"
            },
        }
    ]
}
