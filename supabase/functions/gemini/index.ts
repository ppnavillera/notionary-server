// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/utils.ts";
import { handleGeminiRequest } from "../_shared/api/gemini.ts";
console.log(`Function "browser-with-cors" up and running!`);

Deno.serve(async (req) => {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // POST 요청이 아닌 경우 405 Method Not Allowed 반환
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 405,
        });
    }

    // 여기 도달했다면 req.method는 반드시 "POST"이므로 추가 조건문 불필요
    try {
        const { word } = await req.json();
        const result = await handleGeminiRequest(word);
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
