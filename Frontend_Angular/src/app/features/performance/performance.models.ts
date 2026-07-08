export interface PerformanceReview {
  id: string;
  staffId: string;
  staffName: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  reviewDate: string;
  strengths: string;
  improvements: string;
  goals: string;
  overallScore: number;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: string;
}

export interface PerformanceSummary {
  totalReviews: number;
  averageRating: number;
  highestRating: number;
  lowestRating: number;
  recentReviews: number;
}
