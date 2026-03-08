import { config } from "./../config/env.ts";
import { OpenAIService } from "../services/OpenAIService.ts";

export async function handleOpenAIRequest(word: string) {
    const openAIService = new OpenAIService(config.OPENAI_API_KEY);

    try {
        const definition = await openAIService.getDefinition(word);
        console.log(`definition: ${definition}`);
        console.log(`definition[0]: ${definition[0]}`);
        let openAIResult;
        if (definition[0] === undefined) {
            openAIResult = definition;
        } else {
            openAIResult = definition[0];
        }

        return {
            success: true,
            data: openAIResult,
        };
    } catch (error) {
        console.error("Error processing dictionary request:", error);
        throw error;
    }
}
