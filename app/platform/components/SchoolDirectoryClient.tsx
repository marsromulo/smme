"use client";

import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { type School } from "@/app/platform/data";

function statusIcon(status: string) {
  if (status === "Approved") {
    return <CheckCircle2 aria-hidden="true" size={15} />;
  }

  if (status === "Rejected") {
    return <XCircle aria-hidden="true" size={15} />;
  }

  return <Clock3 aria-hidden="true" size={15} />;
}

export function SchoolDirectoryClient({
  schoolRecordsError,
  schools,
}: {
  schoolRecordsError: string | null;
  schools: School[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredSchools = useMemo(() => {
    if (!normalizedSearchTerm) {
      return schools;
    }

    return schools.filter((school) =>
      [school.name, school.schoolId, school.district, school.type]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearchTerm)),
    );
  }, [normalizedSearchTerm, schools]);

  return (
    <>
      <section className="platform-filter-bar school-list">
        <label className="platform-input-like">
          <Search aria-hidden="true" size={18} />
          <input
            aria-label="Search school name"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search school name"
            type="search"
            value={searchTerm}
          />
        </label>
      </section>

      <section className="platform-section platform-school-directory">
        <div className="platform-school-directory-head">
          <span>School Name</span>
          <span>Registration Status</span>
          <span>Details</span>
        </div>
        <div className="platform-school-name-list">
          {schoolRecordsError ? (
            <p className="platform-empty-state">
              Approved database schools could not be loaded: {schoolRecordsError}
            </p>
          ) : null}
          {filteredSchools.length === 0 ? (
            <p className="platform-empty-state">No schools match your search.</p>
          ) : (
            filteredSchools.map((school) => (
              <Link
                className="platform-school-name-row"
                href={`/platform/schools/${school.slug}`}
                key={school.slug}
              >
                <span className="platform-school-name">
                  <Building2 aria-hidden="true" size={20} />
                  <strong>{school.name}</strong>
                </span>
                <span className={`platform-pill registration-${school.registrationStatus.toLowerCase()}`}>
                  {statusIcon(school.registrationStatus)}
                  {school.registrationStatus}
                </span>
                <span className="platform-school-open">
                  View full detail <ArrowRight aria-hidden="true" size={16} />
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
