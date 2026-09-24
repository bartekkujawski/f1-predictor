# Google sign-in only, via Better Auth

Players sign in with Google, and the app stores no passwords. Magic links were rejected because they
need an email-sending service, and email/password because it brings password storage and reset
flows. Better Auth handles OAuth and keeps sessions in our own Postgres database. Another provider
(e.g. Discord) can be added later if a friend has no Google account.
