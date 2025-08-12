import { Client } from "npm:@notionhq/client";
import type {
  CreatePageParameters,
  PageObjectResponse,
} from "npm:@notionhq/client/build/src/api-endpoints";
import { DictionaryResponse } from "../types/dictionary.ts";

export class NotionService {
  private notion: Client;
  private dbId: string;
  private userId?: string;
  private userService?: any;
  private originalPageId?: string;

  constructor(apiKey: string, dbId: string, userId?: string, userService?: any, originalPageId?: string) {
    this.notion = new Client({ auth: apiKey });
    this.dbId = dbId;
    this.userId = userId;
    this.userService = userService;
    this.originalPageId = originalPageId;
  }

  async checkPageOrDatabase(
    id: string,
  ): Promise<"page" | "database" | "not_found"> {
    try {
      // 먼저 데이터베이스로 시도
      console.log(`Checking if ${id} is a database...`);
      await this.notion.databases.retrieve({ database_id: id });
      console.log(`✅ ${id} is a database`);
      return "database";
    } catch (dbError) {
      console.log(`❌ ${id} is not a database:`, (dbError as Error).message);
      try {
        // 데이터베이스가 아니면 페이지로 시도
        console.log(`Checking if ${id} is a page...`);
        await this.notion.pages.retrieve({ page_id: id });
        console.log(`✅ ${id} is a page`);
        return "page";
      } catch (pageError) {
        console.log(`❌ ${id} is not a page:`, (pageError as Error).message);
        console.log(`🔍 ${id} not found as page or database`);
        return "not_found";
      }
    }
  }

  async createDatabase(parentPageId: string): Promise<string> {
    try {
      const response = await this.notion.databases.create({
        parent: {
          type: "page_id",
          page_id: parentPageId,
        },
        title: [
          {
            type: "text",
            text: {
              content: "단어장",
            },
          },
        ],
        properties: {
          Words: {
            title: {},
          },
          Pronunciation: {
            rich_text: {},
          },
          Definition1: {
            rich_text: {},
          },
          Definition2: {
            rich_text: {},
          },
          "Example Sentence": {
            rich_text: {},
          },
          Synonyms: {
            rich_text: {},
          },
          Antonyms: {
            rich_text: {},
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error("Error creating database:", error);
      throw new Error(
        `Failed to create database in page ${parentPageId}: ${error}`,
      );
    }
  }

  async ensureDatabaseProperties(databaseId: string): Promise<void> {
    try {
      // 현재 데이터베이스의 속성들을 가져옴
      const database = await this.notion.databases.retrieve({ 
        database_id: databaseId 
      });

      const currentProperties = database.properties;
      const requiredProperties = [
        'Words',
        'Pronunciation', 
        'Definition1',
        'Definition2',
        'Example Sentence',
        'Synonyms',
        'Antonyms'
      ];

      const missingProperties: Record<string, any> = {};

      // 누락된 속성 확인
      for (const propName of requiredProperties) {
        if (!currentProperties[propName]) {
          console.log(`Missing property: ${propName}`);
          
          if (propName === 'Words') {
            missingProperties[propName] = { title: {} };
          } else {
            missingProperties[propName] = { rich_text: {} };
          }
        }
      }

      // 누락된 속성이 있으면 업데이트
      if (Object.keys(missingProperties).length > 0) {
        console.log(`Updating database with missing properties:`, Object.keys(missingProperties));
        
        await this.notion.databases.update({
          database_id: databaseId,
          properties: missingProperties
        });
        
        console.log(`Successfully updated database properties`);
      } else {
        console.log(`All required properties exist in database`);
      }
    } catch (error) {
      console.error(`Error checking/updating database properties:`, error);
      throw error;
    }
  }

  async ensureDatabaseExists(): Promise<string> {
    console.log(`🔍 Starting database verification process...`);
    
    // 1. 먼저 원본 페이지 ID부터 확인 (가장 안전한 접근)
    if (this.originalPageId) {
      console.log(`📄 Checking original page ID: ${this.originalPageId}`);
      return await this.ensureDatabaseFromPage(this.originalPageId);
    }
    
    // 2. originalPageId가 없으면 현재 dbId가 데이터베이스인지 확인
    console.log(`🔍 No original page ID. Checking current dbId: ${this.dbId}`);
    const idType = await this.checkPageOrDatabase(this.dbId);
    
    switch (idType) {
      case "database": {
        // 이미 데이터베이스가 존재함 - 속성 확인 및 업데이트
        console.log(`✅ Database ${this.dbId} exists. Checking properties...`);
        try {
          await this.ensureDatabaseProperties(this.dbId);
          return this.dbId;
        } catch (error) {
          console.error(`❌ Failed to verify/update database properties:`, error);
          // 속성 업데이트 실패해도 기존 데이터베이스는 사용 가능
          return this.dbId;
        }
      }

      case "page": {
        // 페이지인 경우 - 하위에 데이터베이스 생성
        console.log(`📄 dbId is a page. Creating database in page: ${this.dbId}`);
        return await this.ensureDatabaseFromPage(this.dbId);
      }

      case "not_found": {
        throw new Error(
          `❌ Unable to find page or database with ID: ${this.dbId}. Please check the ID and permissions, or reconfigure your Notion settings.`,
        );
      }

      default: {
        throw new Error(`❌ Unexpected ID type for ${this.dbId}`);
      }
    }
  }

  async ensureDatabaseFromPage(pageId: string): Promise<string> {
    console.log(`📄 Working with page: ${pageId}`);
    
    // 페이지가 실제로 존재하는지 확인
    const pageType = await this.checkPageOrDatabase(pageId);
    
    if (pageType === "database") {
      console.log(`✅ Page ID is actually a database: ${pageId}`);
      // 이미 데이터베이스라면 속성 확인 후 사용
      try {
        await this.ensureDatabaseProperties(pageId);
        await this.updateDatabaseIdInSupabase(pageId);
        this.dbId = pageId;
        return pageId;
      } catch (error) {
        console.error(`❌ Failed to verify database properties:`, error);
        this.dbId = pageId;
        return pageId;
      }
    }
    
    if (pageType === "not_found") {
      throw new Error(`❌ Page not found: ${pageId}. Please check the page exists and is shared with the integration.`);
    }
    
    // 페이지 하위에서 "단어장" 데이터베이스 검색
    console.log(`🔍 Looking for existing "단어장" database in page...`);
    const existingDbId = await this.findExistingDatabase(pageId);
    
    if (existingDbId) {
      console.log(`✅ Found existing database: ${existingDbId}`);
      await this.ensureDatabaseProperties(existingDbId);
      await this.updateDatabaseIdInSupabase(existingDbId);
      this.dbId = existingDbId;
      return existingDbId;
    }
    
    // 데이터베이스가 없으면 새로 생성
    console.log(`🆕 Creating new database in page: ${pageId}`);
    const newDbId = await this.createDatabase(pageId);
    await this.updateDatabaseIdInSupabase(newDbId);
    this.dbId = newDbId;
    return newDbId;
  }

  async updateDatabaseIdInSupabase(databaseId: string): Promise<void> {
    if (this.userId && this.userService) {
      try {
        await this.userService.updateDatabaseId(this.userId, databaseId);
        console.log(`💾 Updated database ID in Supabase for user ${this.userId}: ${databaseId}`);
      } catch (error) {
        console.error(`❌ Failed to save database ID to Supabase:`, error);
      }
    }
  }

  async findExistingDatabase(pageId: string): Promise<string | null> {
    try {
      // Notion API를 사용하여 페이지 하위의 데이터베이스 목록 조회
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });

      // "단어장" 제목을 가진 데이터베이스 찾기
      for (const block of response.results) {
        if (block.type === 'child_database' && 'child_database' in block) {
          const database = await this.notion.databases.retrieve({
            database_id: block.id
          });
          
          if (database.title && database.title.length > 0) {
            const title = database.title[0].plain_text;
            if (title === "단어장") {
              console.log(`📚 Found existing "단어장" database: ${block.id}`);
              return block.id;
            }
          }
        }
      }
      
      console.log(`📭 No existing "단어장" database found in page`);
      return null;
    } catch (error) {
      console.error(`❌ Error searching for existing database:`, error);
      return null;
    }
  }

  async createPage(data: DictionaryResponse) {
    console.log(`🚀 Creating page for word: ${data.word}`);
    console.log(`📋 Current database ID: ${this.dbId}`);
    console.log(`📄 Original page ID: ${this.originalPageId || 'not provided'}`);
    
    // 데이터베이스 존재 여부 확인 및 필요시 생성
    await this.ensureDatabaseExists();

    // const properties = {
    //   Words: {
    //     title: [
    //       {
    //         text: {
    //           content: data.word,
    //         },
    //       },
    //     ],
    //   },
    //   Definition1: {
    //     rich_text: [
    //       {
    //         text: {
    //           content: data.definition1,
    //         },
    //       },
    //     ],
    //   },
    //   "Example Sentence": {
    //     rich_text: [
    //       {
    //         text: {
    //           content: data.example,
    //         },
    //       },
    //     ],
    //   },
    //   // Definition2는 선택적이므로, data.definition2가 존재할 때만 추가합니다.
    //   ...(data.definition2 && {
    //     Definition2: {
    //       rich_text: [
    //         {
    //           text: {
    //             content: data.definition2,
    //           },
    //         },
    //       ],
    //     },
    //   }),
    //   ...(data.synonyms && {
    //     synonyms: {
    //       rich_text: data.synonyms.map((synonym) => ({
    //         text: {
    //           content: synonym,
    //         },
    //       })),
    //     },
    //   }),
    //   ...(data.antonyms && {
    //     antonyms: {
    //       rich_text: data.antonyms.map((antonym) => ({
    //         text: {
    //           content: antonym,
    //         },
    //       })),
    //     },
    //   }),
    // };
    // properties 객체를 먼저 생성
    const properties: CreatePageParameters["properties"] = {
      Words: {
        title: [
          {
            text: {
              content: data.word,
            },
          },
        ],
      },
      Pronunciation: {
        rich_text: [
          {
            text: {
              content: data.pronunciation,
            },
          },
        ],
      },
      Definition1: {
        rich_text: [
          {
            text: {
              content: data.definition1,
            },
          },
        ],
      },
      "Example Sentence": {
        rich_text: [
          {
            text: {
              content: data.example,
            },
          },
        ],
      },
    };

    // definition2가 null이 아닐 때만 추가
    if (data.definition2 !== null) {
      properties.Definition2 = {
        rich_text: [
          {
            text: {
              content: data.definition2,
            },
          },
        ],
      };
    }
    if (data.synonyms != null) {
      properties.Synonyms = {
        rich_text: [
          {
            text: {
              content: data.synonyms.join(", "),
            },
          },
        ],
      };
    }
    if (data.antonyms != null) {
      properties.Antonyms = {
        rich_text: [
          {
            text: {
              content: data.antonyms.join(", "),
            },
          },
        ],
      };
    }
    const response = await this.notion.pages.create({
      parent: {
        type: "database_id",
        database_id: this.dbId,
      },
      properties: properties,
    }) as PageObjectResponse;
    type NotionProperty = {
      type: "title" | "rich_text";
      title?: Array<{ text: { content: string } }>;
      rich_text?: Array<{ text: { content: string } }>;
    };

    // 헬퍼 함수 생성
    const getPropertyContent = (property: NotionProperty): string | null => {
      if (
        property.type === "title" && property.title && property.title.length > 0
      ) {
        return property.title[0].text.content;
      }
      if (
        property.type === "rich_text" && property.rich_text &&
        property.rich_text.length > 0
      ) {
        return property.rich_text[0].text.content;
      }
      return null;
    };

    // 데이터 할당
    const result = {
      word: getPropertyContent(response.properties.Words as NotionProperty),
      pronunciation: getPropertyContent(
        response.properties.Pronunciation as NotionProperty,
      ),
      definition1: getPropertyContent(
        response.properties.Definition1 as NotionProperty,
      ),
      definition2: getPropertyContent(
        response.properties.Definition2 as NotionProperty,
      ),
      example: getPropertyContent(
        response.properties["Example Sentence"] as NotionProperty,
      ),
      synonyms: getPropertyContent(
        response.properties.Synonyms as NotionProperty,
      ),
      antonyms: getPropertyContent(
        response.properties.Antonyms as NotionProperty,
      ),
      url: response.url,
    };

    console.log(result);
    return result;
  }
}
