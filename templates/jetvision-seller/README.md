This Neuron-node-builder flow demonstrates how to set up a **Jetvision Seller Node** in the [Neuron-Node-Builder](https://github.com/NeuronInnovations/neuron-node-builder) ecosystem.  
It simulates ADS-B flight tracking data, streams it over **UDP (port 5005)**, and then publishes it to connected buyers via the **Neuron P2P network**.

---

## 📌 What the Flow Does
- **Generates simulated Jetvision ADS-B messages** from sample flight data  
- Streams the data to **UDP port 5005** at a configurable rate  
- A **Seller Config node** initializes the Jetvision device identity, Hedera smart contract binding, and marketplace parameters (price, metadata, EVM address, etc.)  
- A **Neuron P2P node** connects the seller to buyers and distributes incoming UDP data across all subscribed buyers  
- Buyers subscribing to this seller will receive live data through their configured channels  

---

## ⚙️ Flow Components

### 🔹 Simulation Group
- **Inject Node ("Trigger Stream")** – Fires periodically to start the message generator  
- **Function Node ("Create Message Stream")** – Cycles through a JSON array of sample ADS-B flight messages (altitude, lat/lon, aircraft type, etc.)  
- **Delay Node ("Throttle Stream")** – Controls the data rate (messages per second)  
- **UDP Out ("UDP Output")** – Sends the simulated data to port **5005** (localhost by default)  

### 🔹 Seller Group
- **UDP In ("JETVISION IN")** – Listens on **port 5005** for incoming flight messages  
- **Seller Config ("Jetvision Seller Config")** – Initializes the seller account, Hedera topics, smart contract, and marketplace parameters  
- **Neuron P2P** – Publishes received data to all connected buyers over the Neuron peer-to-peer network  

---

## 🚀 How to Use
1. Import this flow into Neuron-Node-builder  
2. Open the **Seller Config** node → enter your **device details** (name, price, description, etc.)  
3. Open the **Neuron P2P** node → select **Jetvision Seller Config** from the list
4. Deploy the flow – the seller account and topics will be created on Hedera  
5. Buyers who subscribe to this seller will begin receiving the simulated Jetvision ADS-B data  
6. *(Optional)* Edit the **Function Node** to inject real Jetvision device data or extend the dataset  

---

## 🧩 Example Use Case
This flow allows you to simulate a **Jetvision flight tracker** streaming ADS-B aircraft data into the decentralized marketplace.  
It’s ideal for:
- Testing buyer connections  
- Validating Neuron’s P2P messaging  
- Simulating IoT data sales  

---
