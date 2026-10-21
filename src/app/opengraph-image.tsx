import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export const alt = "People I’d Hire Again — good people finding each other";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#F7F3EC",
        color: "#20221F",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
      }}
    >
      <div
        style={{
          fontSize: 22,
          color: "#345445",
          letterSpacing: 4,
          marginBottom: 35,
        }}
      >
        A PANDADOC COMMUNITY INITIATIVE
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.1, fontFamily: "serif" }}>
        <span>People I’d</span>
        <span>Hire Again</span>
      </div>
      <div style={{ fontSize: 30, marginTop: 35, color: "#65645E" }}>
        Good people. Their next chapter.
      </div>
      <div style={{ fontSize: 17, marginTop: 35, color: "#65645E" }}>
        Independent. Not affiliated with or endorsed by PandaDoc.
      </div>
    </div>,
    size,
  );
}
