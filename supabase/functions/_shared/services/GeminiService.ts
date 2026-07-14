// // const { GoogleGenerativeAI } = require("@google/generative-ai");
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        // responseSchema: schema,
      },
    });
  }

  async getDefinition(word: string) {
    const prompt =
      `For the given English word, please provide its Korean meanings and related information following the JSON format below. Fill in each field as accurately as possible. If a field does not apply, use \`null\`.

\`\`\`json
{
  "word": string,
  "pronunciation": string,
  "definition1": string,
  "definition2": string | null,
  "example": string,
  "synonyms": string[] | null,
  "antonyms": string[] | null
}
\`\`\`

**Instructions:**
1. **word**: The provided English word.
2. **pronunciation**: The British pronunciation of the given word in phonetic symbols (IPA). Use standard British English (RP) IPA notation within forward slashes. Note: British English is non-rhotic, so 'r' sounds should only appear before vowels (e.g., "/həˈləʊ/", "/ˈpɑːti/").
3. **definition1**: The primary meaning of the word, including the part of speech. **Only use the following valid abbreviations for parts of speech: (adj) for adjective, (adv) for adverb, (n) for noun, (v) for verb, and (interj) for interjection.** For example, for a greeting like "hello", use "(interj)".
4. **definition2**: A secondary meaning (if available); if not, set this to \`null\`.
5. **example**: A sentence demonstrating the usage of the word.
6. **synonyms**: An array of synonyms; if there are none, use \`null\`.
7. **antonyms**: An array of antonyms; if there are none, use \`null\`.

**Important note about antonyms**: Please provide antonyms when they exist, even if they are prefixed forms (like "malfunction" for "function", "disable" for "enable", "disconnect" for "connect"). Don't set antonyms to null unless there truly are no opposite words.

**Example:**

Q: complete
A:
\`\`\`json
{
  "word": "complete",
  "pronunciation": "/kəmˈpliːt/",
  "definition1": "(adj) 완전한",
  "definition2": "(v) 완료하다",
  "example": "He completed the project on time.",
  "synonyms": ["entire", "whole", "total"],
  "antonyms": ["incomplete", "partial"]
}
\`\`\`

**Task:**

Now, provide the output for the following word:

Q: ${word}
A:`;
    const result = await this.model.generateContent(prompt);
    const json = JSON.parse(result.response.text());
    console.log(result.response);
    return json;
  }
}
