import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

const BATCH_SIZE = 50;

@Injectable()
export class AiCategorizerService {
  private client: Groq;

  constructor(private config: ConfigService) {
    this.client = new Groq({
      apiKey: this.config.get<string>('GROQ_API_KEY'),
    });
  }

  async categorize(
    transactions: Array<{ id: string; description: string; merchantName: string | null; amount: number }>,
    categoryNames: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (transactions.length === 0) return result;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const batchResult = await this.categorizeBatch(batch, categoryNames);
      for (const [id, cat] of batchResult) result.set(id, cat);
    }

    return result;
  }

  private async categorizeBatch(
    transactions: Array<{ id: string; description: string; merchantName: string | null; amount: number }>,
    categoryNames: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    const txList = transactions
      .map((t, idx) => {
        const label = t.merchantName && t.merchantName !== t.description
          ? `${t.merchantName} (${t.description})`
          : t.description;
        const type = t.amount < 0 ? 'income' : 'expense';
        return `${idx + 1}. [${type}] ${label}`;
      })
      .join('\n');

    const prompt = `Categorize each bank transaction into exactly one of these categories:
${categoryNames.join(', ')}

Transactions:
${txList}

Rules:
- Negative amount = income (salary, interest, refund, transfer received)
- Positive amount = expense
- Use "Miscellaneous" only if nothing else fits

Reply with ONLY a JSON array: [{"index":1,"category":"CategoryName"},...]
Every transaction must have an entry. Category must exactly match one from the list.`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0,
      });

      const text = response.choices[0]?.message?.content ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return result;

      const assignments: Array<{ index: number; category: string }> = JSON.parse(jsonMatch[0]);
      for (const a of assignments) {
        const tx = transactions[a.index - 1];
        if (tx && categoryNames.includes(a.category)) {
          result.set(tx.id, a.category);
        }
      }
    } catch (err) {
      console.error('[AiCategorizer] Groq categorization failed:', err instanceof Error ? err.message : err);
    }

    return result;
  }
}
