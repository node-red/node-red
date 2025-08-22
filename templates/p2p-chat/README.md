# Neuron P2P Chat Demo
This flow demonstrates how to build a **decentralized peer-to-peer (P2P) chat application** inside Node-RED using the [Neuron-Node-Builder](https://github.com/NeuronInnovations/neuron-node-builder) custom nodes.  
It showcases how a **Seller node** can broadcast chat messages into the Neuron network, while a **Buyer node** subscribes and exchanges data securely via Hedera Hashgraph and the Neuron P2P SDK.

---

## 🔹 How It Works

### Seller Config
- Creates a **Hedera account** for the seller.  
- Automatically generates three topics:
  - `stdin` → inbound control messages.  
  - `stdout` → outbound chat messages.  
  - `stderr` → error logs.  
- Configures the seller with an **EVM address**, **device type**, and **contract binding**.  
- Once deployed, the seller can broadcast messages over the Neuron P2P network.

### Buyer Config
- Initializes a **Hedera buyer account** and its own topics.  
- Lets you **add Seller EVM addresses** to connect directly to chosen sellers.  
- On deployment, the buyer subscribes to the sellers’ outbound streams and joins their chat session.

### Neuron P2P Node
- Acts as the **communication bridge** between Buyers and Sellers.  
- You must **open each Neuron P2P node** in the flow and select the relevant **Buyer Config** or **Seller Config** to link them properly.  
- Handles **secure P2P networking, discovery, and message delivery**.  
- Requires **port forwarding (61336–61346)** on your router to allow external peers to connect.

### Chat Messaging
- Seller messages are passed into the **Neuron P2P node** and distributed to connected buyers.  
- Buyers can also send chat messages upstream, enabling **two-way conversation**.  
- The included **debug node** displays all received chat messages in the Node-RED debug sidebar.

---

## ⚙️ Setup Instructions

1. **Deploy the Seller Node**
   - Open the **Seller Config** node.  
   - Configure your seller details (device type, smart contract, etc.).  
   - Deploy to initialize the seller account and topics.  

2. **Deploy the Buyer Node**
   - Open the **Buyer Config** node.  
   - Add the **Seller’s EVM address**.  
   - Deploy to connect to the seller’s data streams.  

3. **Link P2P Nodes**
   - Open each **Neuron P2P node** in the flow.  
   - Select the appropriate **Buyer Config** or **Seller Config** so that they are bound to the right accounts.  

4. **Enable Networking**
   - Configure your router to forward **ports 61336–61346** to your Node-RED machine.  

5. **Test the Chat**
   - Go to http://localhost:1880/ui
   - Send messages via the Seller or Buyer.  
   - Check the **debug sidebar** to confirm message exchange.  

---

## 🌍 Use Cases
- Decentralized **real-time chat applications**.  
- **IoT device messaging** without central servers.  
- Testing **Hedera-based peer-to-peer applications**.  
- Learning and prototyping with Neuron’s Buyer/Seller model.  

---

## 🔗 Repository
👉 Full SDK and example flows: [Neuron-Node-Builder on GitHub](https://github.com/NeuronInnovations/neuron-node-builder)  
