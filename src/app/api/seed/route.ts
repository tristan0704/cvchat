import { prisma } from "@/lib/prisma"
import {fakeCv} from "@/lib/fakeCV";

async function seed() {
    await prisma.cv.upsert({
        where: { token: fakeCv.meta.token },
        update: {},
        create: {
            token: fakeCv.meta.token,
            data: fakeCv,
        },
    })

    return Response.json({ status: "seeded" })
}

export async function POST() {
    return seed()
}

export async function GET() {
    return seed()
}
