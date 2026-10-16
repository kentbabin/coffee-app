// Invites an admin: creates their login (no password; they sign in with an
// emailed code) and adds them to public.admins.
//
//   npm run admin:add -- someone@example.com
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local. Point
// them at staging or production to invite someone there.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:add -- someone@example.com");
  process.exit(1);
}
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(address: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === address);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
}

let userId = await findUserId(email);
if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
}

const { error } = await supabase.from("admins").upsert({ user_id: userId, email });
if (error) throw error;

console.log(`${email} is an admin. They can sign in at /admin/sign-in with a code sent to that address.`);
