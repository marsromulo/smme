import { PageShell } from "../components/PageShell";

const contactDetails = [
  {
    label: "Office",
    value: "Schools Division of Baguio City - SMME Unit",
  },
  {
    label: "Address",
    value: "#82 Military Cut-off Road, Baguio City",
  },
  {
    label: "Phone",
    value: "(074) 442-4326",
  },
  {
    label: "Email",
    value: "quad.depedcar@gmail.com",
  },
  {
    label: "Office Hours",
    value: "Monday - Friday, 8:00 AM - 5:00 PM",
  },
];

export default function ContactPage() {
  return (
    <PageShell title="Contact Us">
      <div className="content-stack">
        <section className="section-head">
          <div>
            <span className="eyebrow">Get in Touch</span>
            <h2>How Can We Help?</h2>
          </div>
          <p>
            Send us your questions, concerns, or requests about SMME services,
            regulatory applications, document requirements, and monitoring or evaluation
            activities.
          </p>
        </section>

        <section className="contact-layout">
          <form className="contact-form">
            <div className="form-grid">
              <label>
                <span>Full Name</span>
                <input name="fullName" type="text" placeholder="Enter your full name" />
              </label>
              <label>
                <span>Email Address</span>
                <input name="email" type="email" placeholder="name@example.com" />
              </label>
              <label>
                <span>Phone Number</span>
                <input name="phone" type="tel" placeholder="Enter your contact number" />
              </label>
              <label>
                <span>School / Organization</span>
                <input name="organization" type="text" placeholder="Enter school or office name" />
              </label>
              <label className="full-span">
                <span>Subject</span>
                <input name="subject" type="text" placeholder="What is your message about?" />
              </label>
              <label className="full-span">
                <span>Message</span>
                <textarea
                  name="message"
                  rows={7}
                  placeholder="Write your message or inquiry here"
                />
              </label>
            </div>
            <button className="btn primary" type="button">
              Send Message
            </button>
          </form>

          <aside className="contact-details">
            <h3>Contact Information</h3>
            <p>
              For official transactions, please include your school name, contact person,
              and a brief description of your concern.
            </p>
            <dl>
              {contactDetails.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
