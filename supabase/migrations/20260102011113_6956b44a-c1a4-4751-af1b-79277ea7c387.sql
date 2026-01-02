-- Create a single secure entrypoint to create conversations + participants (avoids client-side RLS edge cases)
CREATE OR REPLACE FUNCTION public.create_conversation(
  participant_ids uuid[],
  _title text DEFAULT NULL,
  _workspace_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_is_group boolean;
  v_participant uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_group := (COALESCE(array_length(participant_ids, 1), 0) > 1);

  INSERT INTO public.conversations (title, workspace_id, is_group)
  VALUES (_title, _workspace_id, v_is_group)
  RETURNING id INTO v_conv_id;

  -- Always add creator
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id)
  ON CONFLICT DO NOTHING;

  -- Add other participants (dedupe + exclude creator)
  IF participant_ids IS NOT NULL THEN
    FOREACH v_participant IN ARRAY participant_ids LOOP
      IF v_participant IS NULL OR v_participant = v_user_id THEN
        CONTINUE;
      END IF;

      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_participant)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- Allow logged-in users to call it
GRANT EXECUTE ON FUNCTION public.create_conversation(uuid[], text, uuid) TO authenticated;
