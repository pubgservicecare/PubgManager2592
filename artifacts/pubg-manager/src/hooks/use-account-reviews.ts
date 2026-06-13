import { useQuery } from "@tanstack/react-query";

export interface ReviewItem {
  id: number;
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  createdAt: string;
}

export interface AggregateRating {
  avgRating: number;
  count: number;
}

export interface ReviewsData {
  reviews: ReviewItem[];
  aggregateRating: AggregateRating | null;
  canReview: boolean;
  hasReviewed: boolean;
  isLoggedIn: boolean;
  myReview: {
    id: number;
    rating: number;
    reviewText: string | null;
    approved: boolean;
    createdAt: string;
  } | null;
}

export function useAccountReviews(accountId: number | undefined) {
  return useQuery<ReviewsData>({
    queryKey: ["reviews", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/reviews`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!accountId && accountId > 0,
    staleTime: 0,
    gcTime: 0,
  });
}
