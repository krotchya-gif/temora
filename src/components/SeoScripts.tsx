import Script from "next/script";
import { appUrl, getPublicSettings } from "@/lib/seo-settings";

// Injeksi tracking (GA4/GTM/Clarity/Meta Pixel/Ads/TikTok) + JSON-LD.
// ID divalidasi huruf-angka agar tidak bisa menyelundupkan script arbitrer.
function safeId(value: string | undefined): string {
  return (value ?? "").replace(/[^A-Za-z0-9_-]/g, "");
}

function trackingId(value: string | undefined, pattern: RegExp): string {
  const sanitized = safeId(value);
  return pattern.test(sanitized) ? sanitized : "";
}

export async function SeoScripts() {
  const s = await getPublicSettings();
  const ga4 = trackingId(s.tracking_ga4_id, /^G-[A-Z0-9]+$/);
  const gtm = trackingId(s.tracking_gtm_id, /^GTM-[A-Z0-9]+$/);
  const clarity = safeId(s.tracking_clarity_id);
  const pixel = safeId(s.tracking_pixel_id);
  const ads = safeId(s.tracking_ads_id);
  const tiktok = safeId(s.tracking_tiktok_id);

  const base = appUrl();
  const socialKeys = ["social_instagram", "social_tiktok", "social_facebook"];
  const sameAs = socialKeys
    .map((k) => s[k])
    .filter((v): v is string => Boolean(v));

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${base.origin}/#website`,
      url: base.origin,
      name: "TEMORA",
      description: s.seo_description || undefined,
    },
    {
      "@type": "Organization",
      "@id": `${base.origin}/#organization`,
      name: "TEMORA",
      url: base.origin,
      logo: `${base.origin}/logos/temora-wordmark.svg`,
      sameAs: sameAs.length > 0 ? sameAs : undefined,
    },
  ];

  const lat = Number(s.geo_lat);
  const lng = Number(s.geo_lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    graph.push({
      "@type": "LocalBusiness",
      "@id": `${base.origin}/#localbusiness`,
      name: "TEMORA",
      url: base.origin,
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    });
  }

  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <>
      {gtm ? (
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
          }}
        />
      ) : null}
      {ga4 && !gtm ? (
        <>
          <Script
            id="ga4-loader"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`,
            }}
          />
        </>
      ) : null}
      {clarity ? (
        <Script
          id="clarity-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${clarity}');`,
          }}
        />
      ) : null}
      {pixel ? (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
          }}
        />
      ) : null}
      {ads ? (
        <Script
          id="ads-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ads}');`,
          }}
        />
      ) : null}
      {tiktok ? (
        <Script
          id="tiktok-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=n,ttq._t=ttq._t||{},ttq._t[e]=new Date(),ttq._o=ttq._o||{},ttq._o[e]=ttq.requestId||"",ttq._partner=ttq._partner||"UAPJS";var r=document.createElement("script");r.async=!0,r.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(r,a)}(e)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`,
          }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
