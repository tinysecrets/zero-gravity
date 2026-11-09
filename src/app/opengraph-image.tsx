import { ImageResponse } from "next/og";

export const alt = "Zero Gravity — free public DNS check for SPF, DMARC and MX records";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: "64px 72px",
      background: "linear-gradient(135deg, #07090d 0%, #111c24 58%, #17132a 100%)",
      color: "#f4f4f5", fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, border: "2px solid #5eead4", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #5eead4", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5eead4" }} /></div></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: 7 }}>ZERO GRAVITY</div>
          <div style={{ marginTop: 7, color: "#5eead4", fontSize: 14, letterSpacing: 4 }}>A WAH-LAH COMPANY</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ color: "#5eead4", fontSize: 19, fontWeight: 700, letterSpacing: 5 }}>FREE DOMAIN CHECK</div>
        <div style={{ maxWidth: 980, fontSize: 62, fontWeight: 700, lineHeight: 1.08 }}>Know what your domain publishes.</div>
        <div style={{ fontSize: 27, color: "#cbd5e1" }}>SPF · DMARC · MX — explained in plain language.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 22 }}>
        <div style={{ fontSize: 18, color: "#cbd5e1" }}>Read-only · No email gate · No DNS changes</div>
        <div style={{ fontSize: 18, color: "#5eead4", fontWeight: 700 }}>zero-gravity-smoky.vercel.app</div>
      </div>
    </div>,
    { ...size },
  );
}
