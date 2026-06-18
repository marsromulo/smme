import { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type PageShellProps = {
  title: string;
  children: ReactNode;
};

export function PageShell({ title, children }: PageShellProps) {
  return (
    <>
      <SiteHeader />
      <section className="page-hero">
        <div className="container">
          <h1>{title}</h1>
          <p>
            Schools Division of Baguio City - School Management, Monitoring, and
            Evaluation Unit.
          </p>
        </div>
      </section>
      <main className="page-content container">{children}</main>
      <SiteFooter />
    </>
  );
}
