import { renderFlyer } from "@/lib/flyer";
import { imageBytes } from "@/lib/images";
import { getPublicPet } from "@/lib/public";
import { petUrl, shortPetUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/p/[slug]/flyer.pdf">) {
  const { slug } = await ctx.params;
  const pet = await getPublicPet(slug);
  if (!pet) return new Response("Not found", { status: 404 });

  const photo = pet.photos[0] ? await imageBytes(pet.photos[0].url) : null;
  const pdf = await renderFlyer({
    name: pet.name,
    species: pet.species,
    description: pet.description,
    lastSeenAt: pet.lastSeenAt,
    status: pet.status,
    url: petUrl(pet.slug),
    shortUrl: shortPetUrl(pet.slug),
    photo,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${pet.slug}-flyer.pdf"`,
      "cache-control": "no-store",
    },
  });
}
