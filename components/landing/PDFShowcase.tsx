"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function PDFShowcase() {
  const { t } = useSiteLanguage();

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingPdfEyebrow}</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingPdfTitle}
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          {t.landingPdfSubtitleUi}
        </p>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
          <FeatureList
            items={[
              t.landingPdfBullet1Ui,
              t.landingPdfBullet2Ui,
              t.landingPdfBullet3Ui,
              t.landingPdfBullet4Ui,
              t.landingPdfBullet5,
            ]}
          />
          <PDFMockup
            mockHeader={t.landingPdfMockHeader}
            agencyName={t.landingPdfAgencyName}
            refId={t.landingPdfRefId}
            clientName={t.landingPdfClientName}
            secFlights={t.landingPdfSecFlights}
            secHotel={t.landingPdfSecHotel}
            secExtras={t.landingPdfSecExtrasShort}
            flight1={t.landingPdfLineFlight1Short}
            flight2={t.landingPdfLineFlight2Short}
            price187={t.landingPdfLinePrice187}
            hotelName={t.landingHotel1Name}
            hotelMeta={t.landingPdfHotelMeta}
            hotelPrice={t.landingPdfHotelPrice}
            extra1={t.landingPdfLineExtra1Short}
            extra2={t.landingPdfLineExtra2Short}
            extra3={t.landingPdfLineExtra3Short}
            price166={t.landingPdfLinePrice166}
            price312={t.landingPdfLinePrice312}
            price96={t.landingPdfLinePrice96}
            totalLabel={t.landingPdfTotalLabel}
            totalValue={t.landingPdfTotalValue}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-body text-text">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-success">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PDFMockup({
  mockHeader,
  agencyName,
  refId,
  clientName,
  secFlights,
  secHotel,
  secExtras,
  flight1,
  flight2,
  price187,
  hotelName,
  hotelMeta,
  hotelPrice,
  extra1,
  extra2,
  extra3,
  price166,
  price312,
  price96,
  totalLabel,
  totalValue,
}: {
  mockHeader: string;
  agencyName: string;
  refId: string;
  clientName: string;
  secFlights: string;
  secHotel: string;
  secExtras: string;
  flight1: string;
  flight2: string;
  price187: string;
  hotelName: string;
  hotelMeta: string;
  hotelPrice: string;
  extra1: string;
  extra2: string;
  extra3: string;
  price166: string;
  price312: string;
  price96: string;
  totalLabel: string;
  totalValue: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-1 bg-paper shadow-card-hover">
      <div className="bg-ink px-5 py-4 text-paper">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper/60">
          {mockHeader}
        </span>
        <h3 className="mt-1 font-serif text-[20px] text-paper" style={{ fontWeight: 500 }}>
          {agencyName}
        </h3>
        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-paper/70">
          <span>{refId}</span>
          <span>·</span>
          <span>{clientName}</span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <PDFSection label={secFlights}>
          <PDFLine left={flight1} right={price187} />
          <PDFLine left={flight2} right={price187} />
        </PDFSection>
        <PDFSection label={secHotel}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border-1 py-1.5 text-body-sm">
            <div>
              <div className="font-serif text-[14px] leading-tight text-ink" style={{ fontWeight: 500 }}>
                {hotelName}
              </div>
              <span className="text-[11px] text-text-2">{hotelMeta}</span>
            </div>
            <span className="font-mono text-ink">{hotelPrice}</span>
          </div>
        </PDFSection>
        <PDFSection label={secExtras}>
          <PDFLine left={extra1} right={price166} />
          <PDFLine left={extra2} right={price312} />
          <PDFLine left={extra3} right={price96} />
        </PDFSection>
        <div className="mt-2 flex items-end justify-between border-t-2 border-ink pt-3">
          <div>
            <span className="eyebrow">{totalLabel}</span>
            <div className="mt-1 h-0.5 w-8 bg-umber" />
          </div>
          <div className="font-serif text-[28px] leading-none text-ink tabular-nums" style={{ fontWeight: 500 }}>
            {totalValue}
          </div>
        </div>
      </div>
    </div>
  );
}

function PDFSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="eyebrow mb-2 block">{label}</span>
      <div className="space-y-1.5 text-body-sm">{children}</div>
    </div>
  );
}

function PDFLine({
  left,
  right,
}: {
  left: React.ReactNode;
  right: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-1 py-1.5">
      <span className="text-text">{left}</span>
      <span className="font-mono text-ink">{right}</span>
    </div>
  );
}
