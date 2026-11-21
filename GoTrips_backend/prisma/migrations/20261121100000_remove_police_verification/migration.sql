-- Drivers no longer need (or can upload) a police verification certificate during registration.
DELETE FROM "document_requirements" WHERE "doc_type" = 'police_verification';
