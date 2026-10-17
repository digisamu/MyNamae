import { ImageResponse } from "next/og";
import { SealArtwork } from "./sealArtwork";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF9F6" }}>
        <SealArtwork size={440} />
      </div>
    ),
    size,
  );
}
