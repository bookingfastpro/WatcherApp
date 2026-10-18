-- Défense en profondeur (Supabase) : RLS activée, AUCUNE policy.
-- => aucun accès via l API Supabase (rôles anon / authenticated, clé publishable).
-- L application se connecte avec le rôle propriétaire des tables, qui contourne la RLS : rien ne change pour elle.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professional_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "theft_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watch_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professional_searches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "potential_match_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
