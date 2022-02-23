# Sparkles Guides Contribution Guidelines

The Guides are crowd sourced and contributions should be made with the overarching audience in mind.

At the simplest level:

1. Run Sparkles Guide
2. Make an update in the UI (i.e. new flow, new topic, new material, etc...)
3. Save the flow (by clicking the "Deploy" button, until issue #5 is resolved)
4. commit and push your changes (which are saved in data/flows.json)

## Conventions and Guidelines

- Topics within flows, build upon each other from top to bottom. For example, knowing containerization prior to kubernetes.
- Use subflows when a common topic exists. Ex. Zarf requires golang, which is a learning topic itself, or BigBang requires kubernetes
- Add materials (youtube, course, SME, article, etc...) to the description of nodes.
- Add a * to materials that you found helpful 

## Elements
### Nodes

Nodes are the basic element that can be added to flows, by drag drop. We use nodes to indicate a topic and the properties of a node have descriptions and materials for learning the topic.

### Flows

Flows are the connection of nodes to capture the guide on a larger topic. Flows flow from left to right building nodes up sequentially as a guide. Flow can also include sub-flows, when needing to dive into a deeper topic.

### Subflows

Sub flows can be created for more fundamental guides, such as, kubernetes and inserted into flows/guides as a topic or node. Subflows can only be created with the hamburger menu in the top right of the app. Once created show up as a node on the left panel.



