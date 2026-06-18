import Image from "next/image";
import { PageShell } from "../components/PageShell";

const updates = [
  {
    image: "/assets/images/M&E-Platform-Enhancements.png",
    date: "May 16, 2024",
    title: "M&E Platform Enhancements",
    text: "New platform improvements are available to help schools submit requirements, monitor status updates, and manage application records.",
  },
  {
    image: "/assets/images/TOSFI-Application-Deadlines.png",
    date: "May 10, 2024",
    title: "Reminder: TOSFI Application Deadlines",
    text: "Schools are reminded to review the schedule, prepare complete documents, and submit TOSFI applications within the prescribed period.",
  },
  {
    image: "/assets/images/Updated-Guidelines-Released.png",
    date: "May 2, 2024",
    title: "Updated Guidelines Released",
    text: "Updated references and process reminders are now available for school administrators and authorized representatives.",
  },
];

export default function NewsPage() {
  return (
    <PageShell title="News & Updates">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Latest Announcements</span>
            <h2>News and Updates</h2>
          </div>
          <p>
            Read announcements, reminders, and service updates from the SMME Unit for school
            administrators, stakeholders, and partner offices.
          </p>
        </section>

        <section className="news-list">
          {updates.map((update) => (
            <article className="news-list-card" key={update.title}>
              <Image src={update.image} alt="" width={360} height={210} />
              <div>
                <span className="date-label">{update.date}</span>
                <h3>{update.title}</h3>
                <p>{update.text}</p>
                <a href="#">Read more &gt;</a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
