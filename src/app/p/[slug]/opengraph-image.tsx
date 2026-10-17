import { ImageResponse } from "next/og";
import { loadFonts } from "@/lib/fonts";
import { imageBytes } from "@/lib/images";
import { getPublicPet } from "@/lib/public";
import { ago } from "@/lib/time";

export const runtime = "nodejs";
export const alt = "Lost pet poster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f4efe4";
const INK = "#1d1c18";
const MUTED = "#5d584e";
const SIGNAL = "#b0461f";
const FOUND = "#2f5d3a";

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const [pet, fonts] = await Promise.all([getPublicPet(slug), loadFonts()]);
  const photo = pet?.photos[0] ? await imageBytes(pet.photos[0].url) : null;
  const name = pet?.name ?? "comehome";
  const found = pet?.status === "found";
  const label = pet ? { dog: "dog", cat: "cat", other: "pet" }[pet.species] : "pet";
  const nameSize = Math.round(Math.max(64, Math.min(150, 560 / (Math.max(name.length, 3) * 0.56))));

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: CREAM, color: INK }}>
        {photo ? (
          <img
            src={`data:image/jpeg;base64,${photo.toString("base64")}`}
            width={560}
            height={630}
            style={{ objectFit: "cover", width: 560, height: 630 }}
            alt=""
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 56px 52px",
          }}
        >
          <div style={{ fontFamily: "Hanken", fontWeight: 700, fontSize: 26, color: MUTED, letterSpacing: 1 }}>
            {`${found ? "Found" : `Lost ${label}`} · Tahoe & Truckee`}
          </div>
          <div
            style={{
              fontFamily: "Fraunces",
              fontWeight: 600,
              fontSize: nameSize,
              lineHeight: 0.95,
              letterSpacing: -3,
              marginTop: 18,
            }}
          >
            {name}
          </div>
          {pet ? (
            <div style={{ fontFamily: "Hanken", fontSize: 32, marginTop: 20, color: INK }}>
              {found ? "Home safe. Thank you, Tahoe." : `Last seen ${ago(pet.lastSeenAt)}`}
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Hanken",
                fontWeight: 700,
                fontSize: 30,
                color: "#fff",
                background: found ? FOUND : SIGNAL,
                borderRadius: 999,
                padding: "16px 34px",
              }}
            >
              {found ? `${name} is home` : "Seen them? Tap to report"}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fonts.fraunces600, weight: 600, style: "normal" },
        { name: "Hanken", data: fonts.hanken400, weight: 400, style: "normal" },
        { name: "Hanken", data: fonts.hanken700, weight: 700, style: "normal" },
      ],
    },
  );
}
