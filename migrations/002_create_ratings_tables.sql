-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL, -- Agent ID or Listing ID
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('agent', 'listing')),
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  responsiveness INTEGER CHECK (responsiveness IS NULL OR (responsiveness >= 1 AND responsiveness <= 5)),
  communication INTEGER CHECK (communication IS NULL OR (communication >= 1 AND communication <= 5)),
  professionalism INTEGER CHECK (professionalism IS NULL OR (professionalism >= 1 AND professionalism <= 5)),
  accuracy INTEGER CHECK (accuracy IS NULL OR (accuracy >= 1 AND accuracy <= 5)),
  verified BOOLEAN DEFAULT FALSE,
  helpful INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_rating_per_user_per_target UNIQUE(user_id, target_id, target_type),
  CONSTRAINT valid_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create review_reports table for moderation
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  reason VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,

  CONSTRAINT fk_rating FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_ratings_target ON ratings(target_id, target_type);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_created ON ratings(created_at DESC);
CREATE INDEX idx_review_reports_status ON review_reports(status);

-- Create views for analytics
CREATE VIEW agent_rating_summary AS
SELECT
  target_id as agent_id,
  COUNT(*) as total_ratings,
  COUNT(CASE WHEN review IS NOT NULL THEN 1 END) as total_reviews,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  ROUND(AVG(responsiveness)::numeric, 2) as avg_responsiveness,
  ROUND(AVG(communication)::numeric, 2) as avg_communication,
  ROUND(AVG(professionalism)::numeric, 2) as avg_professionalism,
  ROUND(AVG(accuracy)::numeric, 2) as avg_accuracy
FROM ratings
WHERE target_type = 'agent' AND NOT reported
GROUP BY target_id;

CREATE VIEW listing_rating_summary AS
SELECT
  target_id as listing_id,
  COUNT(*) as total_ratings,
  COUNT(CASE WHEN review IS NOT NULL THEN 1 END) as total_reviews,
  ROUND(AVG(rating)::numeric, 2) as average_rating
FROM ratings
WHERE target_type = 'listing' AND NOT reported
GROUP BY target_id;

-- Enable RLS (Row Level Security)
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all ratings"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND target_id <> auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = target_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND target_id <> auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Reporters can view own review reports"
  ON review_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create review reports"
  ON review_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());
