import { DatabaseService } from "./DatabaseService.ts";
import { UserNotionConfig, UserSettings } from "../types/user.ts";
import { extractNotionPageId } from "../utils.ts";

export class UserService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const userSettings = await this.db.findOne<UserSettings>("notion", {
        user_id: userId,
      });
      return userSettings;
    } catch (error) {
      console.error("Error fetching user settings:", error);
      return null;
    }
  }

  async getUserNotionConfig(userId: string): Promise<UserNotionConfig | null> {
    const userSettings = await this.getUserSettings(userId);

    if (!userSettings) {
      return null;
    }

    // 특정 사용자 ID에 대해서는 URL 파싱 없이 바로 설정 반환
    if (userId === 'a1eddbe9-4470-4888-a675-bfe84c68fe8f') {
      console.log(`🔑 Special user ID detected. Skipping URL parsing for user: ${userId}`);
      const pageId = userSettings.database_id || userSettings.page_id;
      return {
        apiKey: userSettings.api_key,
        pageId: pageId,
        originalPageId: null, // 특정 사용자는 originalPageId 사용하지 않음
      };
    }

    try {
      // 원본 페이지 ID 추출 (복구 시 사용)
      const originalPageId = extractNotionPageId(userSettings.page_id);
      
      // database_id가 있으면 우선 사용, 없으면 page_id에서 추출
      const pageId = userSettings.database_id 
        ? userSettings.database_id 
        : originalPageId;
      
      return {
        apiKey: userSettings.api_key,
        pageId: pageId,
        originalPageId: originalPageId,
      };
    } catch (error) {
      console.error('Error extracting Notion page ID:', error);
      throw new Error(`Invalid Notion page URL for user ${userId}: ${userSettings.page_id}`);
    }
  }

  async updateDatabaseId(userId: string, databaseId: string): Promise<void> {
    try {
      const { error } = await this.db.client
        .from('notion')
        .update({ 
          database_id: databaseId,
          database_created_at: new Date().toISOString()
        })
        .match({ user_id: userId });

      if (error) {
        throw new Error(`Failed to update database ID: ${error.message}`);
      }

      console.log(`Updated database ID for user ${userId}: ${databaseId}`);
    } catch (error) {
      console.error('Error updating database ID:', error);
      throw error;
    }
  }
}
