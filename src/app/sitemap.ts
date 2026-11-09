import type { MetadataRoute } from "next";
const base="https://zero-gravity-smoky.vercel.app";
export default function sitemap():MetadataRoute.Sitemap{return [{url:base,changeFrequency:"weekly",priority:1},{url:base+"/trust",changeFrequency:"monthly",priority:0.8},{url:base+"/how-it-works",changeFrequency:"monthly",priority:0.8},{url:base+"/resources/email-authentication-basics",changeFrequency:"monthly",priority:0.7},{url:base+"/privacy",changeFrequency:"yearly",priority:0.4}];}
