-- The app-password/IMAP ingestion path (lib/mail/imap-client.ts,
-- lib/mail/secret.ts) was dead code superseded by Gmail OAuth sync
-- (app/actions/bank/sync.ts) and has been removed. This table always had
-- zero rows in the shipped app; dropping it rather than leaving an unused
-- table with a plaintext-adjacent name in the schema.
DROP TABLE IF EXISTS `mail_credentials`;
