import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { requireUser, checkAIRateLimit, generateRequestId, createLogger } from '../_shared/security.ts';

const FUNCTION_NAME = 'transcribe-audio';

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      log.error('LOVABLE_API_KEY not configured');
      return corsJsonResponse({ error: 'AI service not configured', code: 'CONFIG_ERROR' }, req, 500);
    }

    // SECURITY: Require authenticated user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      log.warn('Unauthorized access attempt');
      return authResult.error;
    }

    const user = authResult.user;
    log.info('Processing transcription request', { userId: user.id });

    // RATE LIMITING: Check AI rate limit (more restrictive for transcription)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const withinLimit = await checkAIRateLimit(supabase, user.id, null, FUNCTION_NAME, 10);

    if (!withinLimit) {
      log.warn('Rate limit exceeded', { userId: user.id });
      return corsJsonResponse({ 
        error: 'Rate limit exceeded. You can make up to 10 transcription requests per hour.',
        code: 'RATE_LIMITED'
      }, req, 429);
    }

    // Parse and validate request body
    let body: { audio?: unknown; workspace_id?: unknown; mimeType?: unknown };
    try {
      body = await req.json();
    } catch {
      return corsJsonResponse({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, req, 400);
    }
    
    const { audio, workspace_id, mimeType } = body;

    if (!audio || typeof audio !== 'string') {
      log.error('No audio data provided');
      return corsJsonResponse({ error: 'No audio data provided', code: 'BAD_REQUEST' }, req, 400);
    }
    
    // Validate audio size (max 10MB base64 ~ 7.5MB raw)
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
    if (audio.length > MAX_AUDIO_SIZE) {
      log.error('Audio data too large', { size: audio.length, max: MAX_AUDIO_SIZE });
      return corsJsonResponse({ error: 'Audio file too large (max 10MB)', code: 'BAD_REQUEST' }, req, 400);
    }
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/=]+$/.test(audio)) {
      log.error('Invalid base64 audio format');
      return corsJsonResponse({ error: 'Invalid audio format', code: 'BAD_REQUEST' }, req, 400);
    }

    log.info('Processing audio', { audioLength: audio.length, workspaceId: workspace_id });

    // Process audio in chunks to avoid memory issues
    const binaryAudio = processBase64Chunks(audio);
    log.info('Binary audio processed', { bytes: binaryAudio.length });

    // Use Gemini model with audio input capability
    // Honor the mimeType from the request for cross-browser compatibility
    const actualMimeType = typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm';
    const audioDataUrl = `data:${actualMimeType};base64,${audio}`;
    log.info('Using mimeType', { mimeType: actualMimeType });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe the following audio recording accurately. Return ONLY the transcription text, nothing else. If you cannot understand the audio or there is no speech, respond with '[No speech detected]'."
              },
              {
                type: "image_url",
                image_url: {
                  url: audioDataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('AI gateway error', new Error(errorText), { status: response.status });
      
      if (response.status === 429) {
        return corsJsonResponse({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED'
        }, req, 429);
      }
      if (response.status === 402) {
        return corsJsonResponse({ 
          error: 'AI credits exhausted. Please add credits to continue.',
          code: 'CREDITS_EXHAUSTED'
        }, req, 402);
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const transcription = data.choices?.[0]?.message?.content?.trim() || "";
    
    if (!transcription || transcription === "[No speech detected]") {
      log.info('No speech detected in audio');
      return corsJsonResponse({ text: "", note: "No speech detected" }, req);
    }

    log.info('Transcription successful', { textLength: transcription.length });

    return corsJsonResponse({ text: transcription }, req);

  } catch (error) {
    log.error('Fatal error', error);
    // Return sanitized error to client
    return corsJsonResponse({ error: 'Transcription failed', code: 'INTERNAL_ERROR' }, req, 500);
  }
});
