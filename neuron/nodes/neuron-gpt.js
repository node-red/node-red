// NeuronGPT - AI Assistant for Neuron Software
// Built for Node-RED v4.0.9 with integrated Neuron SDK

module.exports = function(RED) {
    "use strict";
    
    function NeuronGPTNode(config) {
        RED.nodes.createNode(this, config);
        
        // Get configuration
        this.apiKey = config.apiKey;
        this.enableWebSearch = config.webSearch;
        this.name = config.name || "NeuronGPT";
        
        // Context about your software
        this.neuronContext = `
        This app is a fork of Node-RED v4.0.9 with Neuron SDK deeply integrated. 
        Any questions you get asked will be about this app. 
        Questions unrelated to this app shouldn't be answered.
        
        The Neuron SDK handles blockchain-based machine-to-machine commerce.
        Built on Hedera blockchain technology.
        Uses smart contracts for automated trading.
        Custom nodes include: buyer, seller, neuron-p2p, process-manager, stdout, stdin, stderr.
        
        This is a specialized Node-RED application for machine-to-machine commerce.
        `;
        
        this.on('input', async function(msg) {
            try {
                const userQuestion = msg.payload;
                
                // Create enhanced prompt with context
                let fullPrompt = `${this.neuronContext}\n\nUser question: ${userQuestion}`;
                
                // Add web search if enabled
                if (this.enableWebSearch) {
                    const webResults = await this.searchWeb(`Node-RED ${userQuestion}`);
                    fullPrompt += `\n\nWeb search results for current Node-RED information:\n${webResults}`;
                }
                
                // Send to ChatGPT
                const response = await this.chatWithGPT(fullPrompt);
                
                // Send response
                msg.payload = response.content;
                msg.context = {
                    links: {
                        nodeRedDocs: "https://nodered.org/docs/",
                        hederaDocs: "https://docs.hedera.com/",
                        smartContracts: "https://docs.hedera.com/hedera/smart-contracts/"
                    },
                    webSearchUsed: this.enableWebSearch,
                    timestamp: new Date().toISOString()
                };
                
                this.send(msg);
                
            } catch (error) {
                this.error("NeuronGPT error: " + error.message, msg);
            }
        });
        
        // ChatGPT API integration
        this.chatWithGPT = async function(prompt) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "gpt-4",
                        messages: [
                            {
                                role: "system",
                                content: "You are an AI assistant for Neuron software. Only answer questions about this app, Node-RED, or the Neuron SDK. Provide helpful, accurate responses with relevant links. If someone asks about unrelated topics, politely redirect them to ask about the Neuron app."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                return data.choices[0].message;
                
            } catch (error) {
                throw new Error(`ChatGPT API error: ${error.message}`);
            }
        };
        
        // Web search capability using DuckDuckGo
        this.searchWeb = async function(query) {
            try {
                // Using DuckDuckGo (free, no API key required)
                const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
                
                const response = await fetch(searchUrl);
                const data = await response.json();
                
                if (data.Abstract) {
                    return `Search result: ${data.Abstract}\nSource: ${data.AbstractURL}`;
                } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                    return `Related: ${data.RelatedTopics[0].Text}`;
                } else {
                    return "No web search results found.";
                }
            } catch (error) {
                return "Web search unavailable.";
            }
        };
    }
    
    RED.nodes.registerType("neuron-gpt", NeuronGPTNode);
};

