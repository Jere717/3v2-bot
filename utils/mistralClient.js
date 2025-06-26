// utils/mistralClient.js
const { MistralClient } = require('@mistralai/mistralai');

class MistralAIClient {
  constructor(apiKey) {
    this.client = new MistralClient({ apiKey });
  }

  async generateResponse(prompt, model = 'mistral-small') {
    try {
      const response = await this.client.chat({
        model,
        messages: [{ role: 'user', content: prompt }]
      });
      return response.choices[0]?.message?.content || "🤖 No entendí, intentá de nuevo.";
    } catch (error) {
      console.error("Mistral error:", error.message);
      return "⚠️ Error al usar la IA.";
    }
  }
}

module.exports = MistralAIClient;
