ALTER TABLE "users"
ALTER COLUMN "clerkUserId" DROP NOT NULL;

ALTER TABLE "users"
ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'clerk',
ADD COLUMN "authSubject" TEXT;

CREATE UNIQUE INDEX "users_authSubject_key" ON "users"("authSubject");
