import { type School, schools } from "../../data";
import { getApprovedSchoolRecords } from "../../school-records";
import { SchoolDirectoryClient } from "@/app/platform/components/SchoolDirectoryClient";

export default async function PlatformSchoolsPage() {
  let approvedSchools: School[] = [];
  let schoolRecordsError: string | null = null;

  try {
    approvedSchools = await getApprovedSchoolRecords();
  } catch (error) {
    schoolRecordsError = error instanceof Error ? error.message : "Unable to load approved schools.";
  }

  const listedSchools = [...approvedSchools, ...schools];

  return (
    <main className="platform-page">
      <section className="platform-page-head">
        <div>
          <span className="platform-kicker">School registry</span>
          <h1>Schools</h1>
          <p>Select a school name to view its full profile, documents, programs, and service history.</p>
        </div>
      </section>

      <SchoolDirectoryClient schoolRecordsError={schoolRecordsError} schools={listedSchools} />
    </main>
  );
}
