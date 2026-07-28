import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 2,
            color: "#5B5F66",
          }}
        >
          TQUOT · PARA AGENCIAS DE VIAJES
        </div>
        <div
          style={{
            fontFamily: "serif",
            fontSize: 88,
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            color: "#0F1419",
          }}
        >
          De email a cotización
          <br />
          en <span style={{ color: "#B85C38" }}>60 segundos</span>.
        </div>
        <div style={{ width: 80, height: 4, background: "#B85C38" }} />
      </div>
    ),
    { ...size },
  );
}
