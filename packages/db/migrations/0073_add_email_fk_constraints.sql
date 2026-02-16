-- Phase 9: Email Hub — foreign key from emails to email_accounts
ALTER TABLE emails
  ADD CONSTRAINT fk_emails_account
  FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE RESTRICT;
