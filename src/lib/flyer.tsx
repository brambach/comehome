/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is a PDF primitive, not an HTML img; it has no alt. */
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { FONT_FILES } from "@/lib/fonts";
import { formatWhen } from "@/lib/time";

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({ family: "Instrument Serif", src: FONT_FILES.serif400, fontWeight: 400 });
  Font.register({
    family: "Instrument Sans",
    fonts: [
      { src: FONT_FILES.sans400, fontWeight: 400 },
      { src: FONT_FILES.sans600, fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

export type FlyerData = {
  name: string;
  species: "dog" | "cat" | "other";
  description: string;
  lastSeenAt: Date;
  status: "lost" | "found";
  url: string;
  shortUrl: string;
  photo: Buffer | null;
};

// Print in near-black on white: flyers get photocopied.
const INK = "#1d1c18";
const MUTED = "#55504a";
const RULE = "#d3c8b3";

const s = StyleSheet.create({
  page: { padding: 36, backgroundColor: "#ffffff", color: INK, fontFamily: "Instrument Sans" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  eyebrow: { fontSize: 24, fontWeight: 600, letterSpacing: 1.5 },
  where: { fontSize: 13, color: MUTED },
  photo: { width: 540, height: 276, objectFit: "cover", borderRadius: 4 },
  name: { fontFamily: "Instrument Serif", marginTop: 10, lineHeight: 1.18, letterSpacing: -1 },
  seen: { fontSize: 15, marginTop: 8 },
  desc: { fontSize: 12.5, lineHeight: 1.4, color: MUTED, marginTop: 8 },
  bottom: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    alignItems: "center",
  },
  qr: { width: 156, height: 156 },
  call: { flex: 1, paddingLeft: 20 },
  ask: { fontFamily: "Instrument Serif", fontSize: 32 },
  how: { fontSize: 14, marginTop: 4 },
  url: { fontSize: 19, fontWeight: 600, marginTop: 10 },
  note: { fontSize: 11.5, color: MUTED, marginTop: 8 },
});

/** The pet's name is the one big move: as large as the line allows. */
export function nameSize(name: string): number {
  return Math.round(Math.max(44, Math.min(112, 540 / (Math.max(name.length, 3) * 0.56))));
}

function Flyer({ data, qr }: { data: FlyerData; qr: string }) {
  const found = data.status === "found";
  const label = { dog: "DOG", cat: "CAT", other: "PET" }[data.species];
  const desc = data.description.length > 320 ? `${data.description.slice(0, 317)}…` : data.description;
  return (
    <Document title={`${found ? "Found" : "Lost"} ${label.toLowerCase()}: ${data.name}`} author="comehome">
      <Page size="LETTER" style={s.page}>
        <View style={s.top}>
          <Text style={s.eyebrow}>{found ? "FOUND" : `LOST ${label}`}</Text>
          <Text style={s.where}>Tahoe &amp; Truckee</Text>
        </View>
        {data.photo ? <Image style={s.photo} src={{ data: data.photo, format: "jpg" }} /> : null}
        <Text style={[s.name, { fontSize: nameSize(data.name) }]}>{data.name}</Text>
        <Text style={s.seen}>
          {found ? "Home safe. Thank you, everyone." : `Last seen ${formatWhen(data.lastSeenAt)}`}
        </Text>
        {desc ? <Text style={s.desc}>{desc}</Text> : null}
        <View style={s.bottom}>
          <Image style={s.qr} src={qr} />
          <View style={s.call}>
            <Text style={s.ask}>Seen {data.name}?</Text>
            <Text style={s.how}>Scan to drop a pin where. 30 seconds, no account.</Text>
            <Text style={s.url}>{data.shortUrl}</Text>
            <Text style={s.note}>Please don&apos;t chase. Note where and when, and report it.</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderFlyer(data: FlyerData): Promise<Buffer> {
  registerFonts();
  const qr = await QRCode.toDataURL(data.url, { errorCorrectionLevel: "M", margin: 1, width: 640 });
  return renderToBuffer(<Flyer data={data} qr={qr} />);
}
