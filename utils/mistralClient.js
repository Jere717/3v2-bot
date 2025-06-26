// utils/mistralClient.js
const { MistralClient } = require('@mistralai/mistralai');

class MistralAIClient {
  constructor(apiKey) {
    this.client = new MistralClient(apiKey); // El apiKey se pasa como string
  }

  async generateResponse(prompt, model = 'mistral-small') {
    try {
      const chatResponse = await this.client.chat({
        model,
        messages: [{ role: 'user', content: prompt }]
      });
      return chatResponse.choices[0]?.message?.content || "🤖 No entendí, intentá de nuevo.";
    } catch (error) {
      console.error("Mistral error:", error.message);
      return "⚠️ Error al usar la IA.";
    }
  }
}

module.exports = MistralAIClient;
