import { Prisma } from "@prisma/client";

import { db } from "@/db-backend/prisma/client";

type AdvisoryLockClient = Pick<typeof db, "$executeRaw">;

export async function acquireTransactionalAdvisoryLock(
    client: AdvisoryLockClient,
    scope: string,
    key: string
) {
    const lockKey = `${scope}:${key}`;

    await client.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}), 0)`
    );
}
