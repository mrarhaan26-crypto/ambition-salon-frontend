export interface SeoPage {
  id: string;
  route: string;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  schemaMarkup: string;
  updatedAt: string;
}
