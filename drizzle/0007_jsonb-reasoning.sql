ALTER TABLE "matches" ALTER COLUMN "reasoning" SET DATA TYPE jsonb USING jsonb_build_object(
  'positives', jsonb_build_array(jsonb_build_object('text', reasoning, 'weight', 2)),
  'negatives', '[]'::jsonb
);