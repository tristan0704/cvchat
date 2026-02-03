import { prisma } from "@/lib/prisma"

export async function GET(
    _req: Request,
    context: { params: Promise<{ token: string }> }
) {
    // ✅ params explizit awaiten (NEU in Next)
    const { token } = await context.params

    if (!token || typeof token !== "string") {
        return Response.json(
            { error: "Missing or invalid token" },
            { status: 400 }
        )
    }

    const meta = await prisma.cvMeta.findUnique({
        where: { cvToken: token },
        select: {
            name: true,
            position: true,
            summary: true,
            imageUrl: true,
        },
    })

    if (!meta) {
        return Response.json({ error: "CV not found" }, { status: 404 })
    }

    return Response.json(meta)
}
