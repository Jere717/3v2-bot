const { Mistral } = require('@mistralai/mistralai');


class MistralAIClient {
  constructor(apiKey) {
    this.client = new Mistral({ apiKey }); // El apiKey debe ir como objeto
  }

  async generateResponse(prompt, model = 'mistral-large-latest') {
    try {
      const res = await this.client.chat.complete({
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content
        || '🤖 No entendí, intentá de nuevo.';
    } catch (err) {
      console.error('Mistral error:', err.message);
      return '⚠️ Error al usar la IA.';
    }
  }
}

module.exports = MistralAIClient;
