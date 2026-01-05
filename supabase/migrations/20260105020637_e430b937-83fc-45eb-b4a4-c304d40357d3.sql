-- Allow authenticated users to view survey definitions that are part of campaigns they have access to
CREATE POLICY "Users can view definitions for their survey instances"
ON survey_definitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM survey_campaigns sc
    JOIN survey_instances si ON si.campaign_id = sc.id
    JOIN workspace_users wu ON wu.workspace_id = si.workspace_id
    WHERE sc.survey_definition_id = survey_definitions.id
      AND wu.user_id = auth.uid()
      AND wu.active = true
  )
);