import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SightingForm } from "@/components/SightingForm";
import { getPublicPet } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/p/[slug]/seen">): Promise<Metadata> {
  const { slug } = await props.params;
  const pet = await getPublicPet(slug);
  return { title: pet ? `I saw ${pet.name}` : "Not found", robots: { index: false } };
}

export default async function SeenPage(props: PageProps<"/p/[slug]/seen">) {
  const { slug } = await props.params;
  const pet = await getPublicPet(slug);
  if (!pet) notFound();

  return (
    <div className="wrap narrow">
      <div className="stack" style={{ paddingBlock: "8px 64px", ["--space" as string]: "22px" }}>
        <Link href={`/p/${pet.slug}`} className="muted">
          ← {pet.name}&apos;s page
        </Link>
        <h1 className="display enter-statement" style={{ fontSize: "clamp(2.75rem, 13vw, 4.5rem)" }}>
          You saw {pet.name}?
        </h1>
        {pet.status === "found" ? (
          <p className="notice" role="status" data-testid="form-closed">
            {pet.name} has been found and is home. Thank you for looking.
          </p>
        ) : (
          <>
            <p className="lede">
              Drop a pin and send it. Everything else is optional. Please don&apos;t chase: it
              usually pushes a scared pet further away.
            </p>
            <SightingForm
              slug={pet.slug}
              name={pet.name}
              centerLat={pet.lastLat}
              centerLng={pet.lastLng}
            />
          </>
        )}
      </div>
    </div>
  );
}
