// utils/mistralClient.js
const { Mistral } = require('@mistralai/mistralai');

class MistralAIClient {
  constructor(apiKey) {
    this.client = new Mistral({ apiKey });
  }

  async generateResponse(prompt, model = 'mistral-large-latest') {
    try {
      const chatResponse = await this.client.chat.complete({
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
