// interface Config {
//   NOTION_API_KEY: string;
//   NOTION_DATABASE_ID: string;
//   GEMINI_API_KEY: string;
// }
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// .env 파일 로드
const env = await load({
  envPath: "./supabase/functions/.env", // path 대신 envPath 사용
  export: true, // Deno.env에 환경 변수로 내보냄
});

export const config = {
  NOTION_API_KEY: Deno.env.get("NOTION_API_KEY") || "",
  NOTION_DATABASE_ID: Deno.env.get("NOTION_DATABASE_ID") || "",
  GEMINI_API_KEY: Deno.env.get("GEMINI_API_KEY") || "",
};

// 필수 환경변수 검증
Object.entries(config).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`${key} is not set in environment variables`);
  } else {
    console.log(`${key} is set correctly. ${value}`);
  }
});

console.log(Deno.env.get("NOTION_API_KEY"));
