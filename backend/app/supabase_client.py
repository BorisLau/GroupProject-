from supabase import Client, create_client
from .config import get_settings

settings = get_settings()

# Use anon key to validate user JWT as a regular app client.
supabase_public: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Use service role key for server-side writes/reads.
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
