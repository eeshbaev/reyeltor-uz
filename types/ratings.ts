// Rating and Review Types
export interface Rating {
  id: string;
  targetId: string; // Agent ID or Listing ID
  targetType: 'agent' | 'listing';
  userId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: string;
  updatedAt: string;
  verified: boolean; // true if user purchased/viewed listing
  helpful: number; // number of helpful votes
  reported: boolean;
}

export interface AgentRating {
  agentId: string;
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  responsiveness: number; // 1-5
  communication: number; // 1-5
  professionalism: number; // 1-5
  accuracy: number; // 1-5
  reviews: Rating[];
}

export interface ListingRating {
  listingId: string;
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  reviews: Rating[];
}

export interface RatingSubmission {
  targetId: string;
  targetType: 'agent' | 'listing';
  rating: number;
  review?: string;
  responsiveness?: number;
  communication?: number;
  professionalism?: number;
  accuracy?: number;
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
