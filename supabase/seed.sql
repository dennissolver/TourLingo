-- Seed data for development

-- Note: In development, you'll need to create a user first via Supabase Auth
-- The trigger will automatically create an operator profile

-- Example: Insert test operator (assumes user already exists in auth.users)
-- INSERT INTO operators (id, name, company_name, primary_language)
-- VALUES (
--     'your-auth-user-id-here',
--     'Tim Bee',
--     'Magnetic Island Tours',
--     'en'
-- );

-- Example tour data (uncomment and update operator_id after creating user)
-- INSERT INTO tours (operator_id, name, access_code, status, max_guests)
-- VALUES 
--     ('your-operator-id', 'Maggie Comprehensive', 'ABC123', 'created', 16),
--     ('your-operator-id', 'Behind the Scenes', 'XYZ789', 'created', 8),
--     ('your-operator-id', 'Maggie Highlights', 'DEF456', 'created', 16);
