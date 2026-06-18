import Link from "next/link";
import Image from "next/image";

export function ServiceSummaryCards() {
  return (
    <div className="service-grid">
      <article className="service-card">
        <Image src="/assets/icons/permit.svg" alt="" width={82} height={82} />
        <h3>Regulatory Applications</h3>
        <p>Submit and track school regulatory requirements through the M&E platform.</p>
        <Link href="/services">Learn More &gt;</Link>
      </article>
      <article className="service-card">
        <Image src="/assets/icons/track.svg" alt="" width={82} height={82} />
        <h3>Online Tracking</h3>
        <p>Monitor application progress, requirements, requests, and notices in real time.</p>
        <a href="#">Launch Platform &gt;</a>
      </article>
      <article className="service-card">
        <Image src="/assets/icons/document.svg" alt="" width={82} height={82} />
        <h3>Documents & Templates</h3>
        <p>Access issuances, guidelines, reports, templates, and references.</p>
        <Link href="/documents">View Documents &gt;</Link>
      </article>
    </div>
  );
}
