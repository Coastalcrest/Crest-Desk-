/**
 * Social Media Integration Provider
 *
 * Abstracts social media platforms (Facebook, Instagram, LinkedIn)
 * behind a common interface for posting and analytics.
 */

// ---- Types ---- //

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  publishedAt?: Date;
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  engagement: SocialEngagement;
  externalId?: string;
  externalUrl?: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter';

export interface SocialEngagement {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  clicks: number;
}

export interface CreatePostOptions {
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  platforms: SocialPlatform[];
}

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  connected: boolean;
  followerCount: number;
  profileUrl: string;
}

export interface SocialAnalytics {
  platform: SocialPlatform;
  period: string;
  totalPosts: number;
  totalEngagement: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  followerGrowth: number;
  topPost?: SocialPost;
}

// ---- Interface ---- //

export interface SocialProvider {
  readonly name: string;

  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Accounts
  getAccounts(): Promise<SocialAccount[]>;

  // Posts
  createPost(options: CreatePostOptions): Promise<SocialPost[]>;
  getPost(postId: string): Promise<SocialPost | null>;
  deletePost(postId: string): Promise<void>;
  getPosts(options?: { platform?: SocialPlatform; limit?: number; offset?: number }): Promise<{ posts: SocialPost[]; total: number }>;

  // Analytics
  getAnalytics(platform: SocialPlatform, periodDays?: number): Promise<SocialAnalytics>;
  getEngagement(postId: string): Promise<SocialEngagement>;
}

// ---- Mock Implementation ---- //

export class MockSocialProvider implements SocialProvider {
  readonly name = 'mock';
  private connected = false;
  private posts: SocialPost[] = [];
  private nextId = 1;
  private accounts: SocialAccount[] = [
    {
      id: 'acc-fb-1',
      platform: 'facebook',
      accountName: 'Coastal Crest Realty',
      accountId: 'fb-12345',
      connected: true,
      followerCount: 2450,
      profileUrl: 'https://facebook.com/coastalcrestrealty',
    },
    {
      id: 'acc-ig-1',
      platform: 'instagram',
      accountName: '@coastalcrest_realty',
      accountId: 'ig-67890',
      connected: true,
      followerCount: 1890,
      profileUrl: 'https://instagram.com/coastalcrest_realty',
    },
    {
      id: 'acc-li-1',
      platform: 'linkedin',
      accountName: 'Coastal Crest Realty LLC',
      accountId: 'li-11111',
      connected: true,
      followerCount: 680,
      profileUrl: 'https://linkedin.com/company/coastalcrestrealty',
    },
  ];

  async connect(_credentials: Record<string, string>): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getAccounts(): Promise<SocialAccount[]> {
    return this.accounts;
  }

  async createPost(options: CreatePostOptions): Promise<SocialPost[]> {
    const created: SocialPost[] = [];
    for (const platform of options.platforms) {
      const post: SocialPost = {
        id: `social-${++this.nextId}`,
        platform,
        content: options.content,
        mediaUrls: options.mediaUrls ?? [],
        scheduledAt: options.scheduledAt,
        publishedAt: options.scheduledAt ? undefined : new Date(),
        status: options.scheduledAt ? 'scheduled' : 'published',
        engagement: { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, clicks: 0 },
        externalId: `ext-${platform}-${this.nextId}`,
        externalUrl: `https://${platform}.com/post/${this.nextId}`,
      };
      this.posts.push(post);
      created.push(post);
    }
    return created;
  }

  async getPost(postId: string): Promise<SocialPost | null> {
    return this.posts.find((p) => p.id === postId) ?? null;
  }

  async deletePost(postId: string): Promise<void> {
    this.posts = this.posts.filter((p) => p.id !== postId);
  }

  async getPosts(options?: { platform?: SocialPlatform; limit?: number; offset?: number }): Promise<{ posts: SocialPost[]; total: number }> {
    let filtered = [...this.posts];
    if (options?.platform) {
      filtered = filtered.filter((p) => p.platform === options.platform);
    }
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { posts: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async getAnalytics(platform: SocialPlatform, _periodDays = 30): Promise<SocialAnalytics> {
    const platformPosts = this.posts.filter((p) => p.platform === platform);
    return {
      platform,
      period: `${_periodDays}d`,
      totalPosts: platformPosts.length,
      totalEngagement: platformPosts.reduce((sum, p) => sum + p.engagement.likes + p.engagement.comments + p.engagement.shares, 0),
      avgLikes: platformPosts.length > 0 ? Math.round(platformPosts.reduce((sum, p) => sum + p.engagement.likes, 0) / platformPosts.length) : 0,
      avgComments: platformPosts.length > 0 ? Math.round(platformPosts.reduce((sum, p) => sum + p.engagement.comments, 0) / platformPosts.length) : 0,
      avgShares: platformPosts.length > 0 ? Math.round(platformPosts.reduce((sum, p) => sum + p.engagement.shares, 0) / platformPosts.length) : 0,
      followerGrowth: Math.floor(Math.random() * 50) + 10,
      topPost: platformPosts[0],
    };
  }

  async getEngagement(postId: string): Promise<SocialEngagement> {
    const post = this.posts.find((p) => p.id === postId);
    return post?.engagement ?? { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, clicks: 0 };
  }
}

// ---- Factory ---- //

export function createSocialProvider(): SocialProvider {
  // In production, would check for Facebook/Instagram/LinkedIn API credentials
  return new MockSocialProvider();
}
