export interface UserSettings {
  user_id: string;
  api_key: string;
  page_id: string;
  database_id: string | null;
  database_created_at: string | null;
  created_at: string;
}

export interface UserNotionConfig {
  apiKey: string;
  pageId: string;
  originalPageId: string | null;
}