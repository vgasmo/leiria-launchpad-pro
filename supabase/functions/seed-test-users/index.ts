import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const testUsers = [
    {
      email: "admin.teste@startupleiria.com",
      password: "Test1234!",
      full_name: "Admin Teste",
      role: "admin",
    },
    {
      email: "consultor.teste@startupleiria.com",
      password: "Test1234!",
      full_name: "Consultor Teste",
      role: "consultor",
    },
    {
      email: "mentor.teste@example.com",
      password: "Test1234!",
      full_name: "Mentor Teste",
      role: "mentor_externo",
    },
  ];

  const results = [];

  for (const user of testUsers) {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === user.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      results.push({ email: user.email, status: "already_exists", id: userId });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name, selected_role: user.role },
      });

      if (error) {
        results.push({ email: user.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: user.email, status: "created", id: userId });
    }

    // Ensure profile exists and is approved
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: user.email,
      full_name: user.full_name,
      account_status: "approved",
    }, { onConflict: "id" });

    // Ensure role exists
    await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: user.role,
    }, { onConflict: "user_id,role" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
