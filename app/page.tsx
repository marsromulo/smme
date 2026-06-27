import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { publicServices } from "./public-services";

const newsItems = [
  {
    image: "/assets/images/school_time.png",
    month: "May",
    day: "16",
    title: "M&E Platform Enhancements",
    text: "New features are now available to improve application and tracking experience.",
  },
  {
    image: "/assets/images/TOSFI-Application-Deadlines.png",
    month: "May",
    day: "10",
    title: "Reminder: TOSFI Application Deadlines",
    text: "Submit your applications on or before the deadline to avoid delays.",
  },
  {
    image: "/assets/images/Updated-Guidelines-Released.png",
    month: "May",
    day: "02",
    title: "Updated Guidelines Released",
    text: "New issuances and guidelines are now available for school stakeholders.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>Building Better Schools Through Good Governance, Monitoring, and Evaluation</h1>
              <span className="accent-line" />
              <p>
                We ensure that schools comply with key regulatory requirements and approval
                processes before starting operations or implementing major changes-for quality,
                safe, and accountable basic education.
              </p>
              <div className="actions">
                <Link className="btn primary" href="/services">
                  Explore Services
                </Link>
                <Link className="btn secondary" href="/platform">
                  Launch M&E Platform &rarr;
                </Link>
              </div>
            </div>
            <div className="hero-image" aria-label="School campus image" />
          </div>
        </section>

        <section className="online-panel container">
          <div className="online-graphic">
            <Image src="/assets/icons/laptop.png" alt="" width={190} height={190} />
          </div>
          <div className="online-copy">
            <span className="badge">New</span>
            <h2>Process Regulatory Requirements Online</h2>
            <p>
              The Schools Division of Baguio City offers an online platform for all Monitoring
              and Evaluation (M&E) services.
            </p>
            <p>
              Submit applications, track status, manage requirements, and receive updates-all in
              one secure and centralized digital system.
            </p>
          </div>
          <div className="online-list">
            <h3>Through the M&E Platform, you can:</h3>
            <ul>
              <li>Submit applications and documents</li>
              <li>Track application status in real-time</li>
              <li>Manage requirements and respond to requests</li>
              <li>Receive updates and decisions digitally</li>
              <li>Access reports and transaction history</li>
            </ul>
          </div>
          <div className="online-card">
            <Image src="/assets/icons/laptop.svg" alt="" width={64} height={64} />
            <h3>Ready to get started?</h3>
            <p>Log in to the M&E Platform to access all services.</p>
            <Link className="btn light" href="/platform">
              Launch Platform &rarr;
            </Link>
          </div>
          <div className="online-features">
            <div>
              <Image src="/assets/icons/check.svg" alt="" width={26} height={26} />
              <span>
                Accessible
                <br />
                <small>anytime, anywhere</small>
              </span>
            </div>
            <div>
              <Image src="/assets/icons/check.svg" alt="" width={26} height={26} />
              <span>
                Efficient
                <br />
                <small>and time-saving</small>
              </span>
            </div>
            <div>
              <Image src="/assets/icons/check.svg" alt="" width={26} height={26} />
              <span>
                Transparent
                <br />
                <small>and accountable</small>
              </span>
            </div>
            <div>
              <Image src="/assets/icons/check.svg" alt="" width={26} height={26} />
              <span>
                Real-time updates
                <br />
                <small>and notifications</small>
              </span>
            </div>
          </div>
        </section>

        <section className="services-section container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Key Regulatory Requirements & Approval Processes</span>
              <h2>Regulatory Services for Schools</h2>
            </div>
            <p>
              These are the key regulatory requirements and approval processes that schools must
              complete and obtain from the relevant authority before commencing operations or
              implementing major institutional changes.
            </p>
          </div>
          <div className="service-grid">
            {publicServices.map((service) => (
              <article className="service-card" key={service.title}>
                <Image src={service.icon} alt="" width={82} height={82} />
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <Link href="/services">Learn More &gt;</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="quick-links container">
          <Link href="/documents">
            <Image src="/assets/icons/document.svg" alt="" width={45} height={45} />
            <span>
              Issuances &
              <br />
              Documents
            </span>
            &gt;
          </Link>
          <Link href="/documents">
            <Image src="/assets/icons/folder.svg" alt="" width={45} height={45} />
            <span>
              Reports &
              <br />
              Templates
            </span>
            &gt;
          </Link>
          <Link href="/documents">
            <Image src="/assets/icons/book.svg" alt="" width={45} height={45} />
            <span>
              Guidelines &
              <br />
              References
            </span>
            &gt;
          </Link>
          <a href="#">
            <Image src="/assets/icons/question.svg" alt="" width={45} height={45} />
            <span>
              Frequently Asked
              <br />
              Questions
            </span>
            &gt;
          </a>
          <Link href="/news">
            <Image src="/assets/icons/news.svg" alt="" width={45} height={45} />
            <span>
              News &
              <br />
              Updates
            </span>
            &gt;
          </Link>
        </section>

        <section className="news-section container">
          <div className="news-head">
            <h2>News & Updates</h2>
            <Link href="/news">View all news &gt;</Link>
          </div>
          <div className="news-grid">
            {newsItems.map((item) => (
              <article className="news-card" key={item.title}>
                <Image src={item.image} alt="" width={420} height={190} />
                <div>
                  <time>
                    <b>{item.month}</b>
                    {item.day}
                  </time>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link href="/news">Read more &gt;</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
