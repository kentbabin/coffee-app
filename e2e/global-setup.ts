import { ADMIN_EMAIL, serviceClient } from "./helpers";

/** Makes sure the test admin exists, as `npm run admin:add` would. */
export default async function globalSetup() {
  const supabase = serviceClient();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let userId = data?.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  if (!userId) {
    const created = await supabase.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
  }
  const { error } = await supabase.from("admins").upsert({ user_id: userId, email: ADMIN_EMAIL });
  if (error) throw new Error(`Could not add the test admin. Is local Supabase running (npm run db:start)? ${error.message}`);
}
