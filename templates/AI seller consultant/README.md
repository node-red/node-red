# AI consultant
This flow demonstrates how to create a decentralized AI consultant using the Neuron-Node-Builder ecosystem. It allows a user to act as a Buyer and communicate directly with a generative AI model acting as a Seller, with all interactions managed by the Neuron P2P network.

## 📌 What the Flow Does
Initializes two distinct nodes: one a Seller Config node for the AI model and one a Buyer Config node for the user. Both create Hedera accounts and messaging topics.

Integrates an AI model (from OpenRouter) and an AI Agent to serve as the AI consultant. The agent takes user prompts and sends the AI's response back through the Neuron network.

Establishes a peer-to-peer connection between the user (Buyer) and the AI (Seller). All user prompts and AI responses are sent directly between the two peers, eliminating the need for a central server.

Provides a custom chat UI in the Node-RED dashboard for a seamless conversational experience.

Requires port forwarding to allow the peer-to-peer connection to be established.

## ⚙️ Flow Components
🔹 AI Model

A connector node that integrates with external AI providers like OpenRouter.

You must configure it with your API key and select a specific AI model.

🔹 AI Agent

A node that handles the conversation logic.

It takes user prompts, sends them to the connected AI model, and formats the response for the Neuron network.

🔹 Seller Config

Creates a seller account on Hedera for the AI consultant.

Sets up topics to receive user queries and broadcast AI responses.

🔹 Buyer Config

Creates a buyer account on Hedera for the user.

Allows you to add the AI's EVM address to establish a direct connection.

🔹 Neuron P2P

The communication bridge for both the Buyer and Seller.

The AI's Neuron P2P node broadcasts responses, while the user's Neuron P2P node sends queries and receives responses.

🔹 UI Template (Buyer Chat UI)

The interactive dashboard UI where you can type queries and see the AI's responses.



## 🚀 How to Use
Configure the AI Model: Double-click the AI Model node, enter your OpenRouter API key, and select a model.

Deploy the flow to initialize the Seller (AI) and Buyer (user) accounts.

Find the Seller's EVM address: Double-click the Consultant Seller Config node and copy its EVM address.

Configure the Buyer: Double-click the Consultant Buyer Config node, click the add button, and paste the Seller's EVM address you just copied.

Configure your router for port forwarding (61336–61346) to enable the P2P connection.

Deploy the flow again to apply the new Buyer configuration.

Go to the Node-RED dashboard and start chatting with your decentralized AI consultant!

## 🧩 Example Use Case
This flow provides a complete example of a decentralized AI service. It is ideal for:

Creating a private, peer-to-peer generative AI application.

Building and testing AI agents that can be monetized on the open market.

Demonstrating the secure, decentralized communication capabilities of the Neuron P2P network.