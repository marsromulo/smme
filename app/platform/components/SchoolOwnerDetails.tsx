export type SchoolOwnerRecord = {
  home_address?: string | null;
  contact_number?: string | null;
  registrant_type?: string | null;
  owner_name?: string | null;
  owner_home_address?: string | null;
  owner_contact_number?: string | null;
  representative_name?: string | null;
};

export function SchoolOwnerDetails({ school }: { school: SchoolOwnerRecord }) {
  const fields = [
    ["Representative", school.registrant_type === "owner" ? null : school.representative_name],
    ["School Owner Name", school.owner_name],
    ["Home Address", school.home_address],
    ["Contact Number", school.contact_number],
  ];
  return (
    <dl className="platform-detail-list">
      {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value?.trim() || "N/A"}</dd></div>)}
    </dl>
  );
}
