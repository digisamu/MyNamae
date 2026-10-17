import { ImageResponse } from "next/og";
import { SealArtwork } from "./sealArtwork";

export const alt = "MyNamae — Roll the dice. Discover your name.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static social preview in the MyNamae style (Latin text only, so it needs no bundled CJK font). */
export default function OpenGraphImage() {
  const die = (label: string, rotate: number) => (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: 30,
        background: "#FFFDF8",
        border: "2px solid #E7E2D8",
        boxShadow: "0 24px 40px -24px rgba(36,36,36,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 46,
        color: "#242424",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {label}
    </div>
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #FAF9F6 0%, #F4F0E8 60%, #F2D9D6 140%)",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <SealArtwork size={84} />
          <div style={{ display: "flex", fontSize: 54, color: "#242424" }}>
            My<span style={{ color: "#B5382A" }}>Namae</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 64, color: "#242424", lineHeight: 1.15 }}>
            <span>Roll the dice.</span>
            <span style={{ color: "#B5382A" }}>Discover your name.</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {die("Ay", -6)}
            {die("Haru", 5)}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
