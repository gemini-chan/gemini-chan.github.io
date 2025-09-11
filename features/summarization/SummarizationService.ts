import { type AIClient, BaseAIService } from '@features/ai/BaseAIService'
import type { Turn } from '@shared/types'

const MODEL_NAME = 'gemini-2.5-flash-lite'

export class SummarizationService extends BaseAIService {
  constructor(client: AIClient) {
    super(client, MODEL_NAME)
  }

  async summarize(transcript: Turn[]): Promise<string> {
    if (!transcript || transcript.length === 0) {
      return ''
    }

    try {
      const prompt = this.createPrompt(transcript)
      return await this.callAIModel(prompt)
    } catch (error) {
      console.error('Error summarizing transcript:', error)
      return ''
    }
  }

  private createPrompt(transcript: Turn[]): string {
    const conversation = transcript
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join('\n')
    return `Summarize the following conversation:\n\n${conversation}`
  }
}
