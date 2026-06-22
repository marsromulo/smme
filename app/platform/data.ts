import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileClock,
  FileText,
  GraduationCap,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

export type PlatformDocument = {
  id: string;
  title: string;
  type: string;
  status: "Approved" | "For revision" | "Under review" | "Returned";
  reviewer: string;
  submitted: string;
  reviewed: string;
  notes: string[];
};

export type School = {
  slug: string;
  name: string;
  schoolId: string;
  type: string;
  district: string;
  address: string;
  contact: string;
  principal: string;
  registrationStatus: "Approved" | "Pending" | "Rejected";
  status: "Active" | "Needs action" | "For validation";
  compliance: number;
  pending: number;
  lastActivity: string;
  programs: string[];
  services: string[];
  documents: PlatformDocument[];
};

export type ModuleItem = {
  href: string;
  label: string;
  description: string;
  count: string;
  icon: LucideIcon;
};

export const platformModules: ModuleItem[] = [
  {
    href: "/platform/schools",
    label: "Schools",
    description: "School registry, status, documents, and application history.",
    count: "24 schools",
    icon: Building2,
  },
  {
    href: "/platform/applications",
    label: "Applications",
    description: "Regulatory service requests queued for screening and review.",
    count: "18 open",
    icon: FileClock,
  },
  {
    href: "/platform/documents/sjh-permit-2026",
    label: "Reviewed Documents",
    description: "Submitted documents with review notes and action results.",
    count: "42 files",
    icon: FileCheck2,
  },
  {
    href: "/platform/register",
    label: "Account Requests",
    description: "School representatives can request access to the platform.",
    count: "Static form",
    icon: ShieldCheck,
  },
];

export const serviceQueue = [
  {
    icon: Award,
    label: "Government Permit",
    school: "Saint Joseph High School",
    status: "For evaluator review",
    due: "Jun 28, 2026",
  },
  {
    icon: RefreshCw,
    label: "Change of Ownership",
    school: "Pine Ridge Learning Center",
    status: "Returned for revision",
    due: "Jun 24, 2026",
  },
  {
    icon: CalendarDays,
    label: "School Calendar",
    school: "Baguio Hope Academy",
    status: "Validated",
    due: "Jul 02, 2026",
  },
  {
    icon: GraduationCap,
    label: "SHS Permit",
    school: "Cordillera Christian Institute",
    status: "For inspection schedule",
    due: "Jul 05, 2026",
  },
];

export const schools: School[] = [
  {
    slug: "saint-joseph-high-school",
    name: "Saint Joseph High School",
    schoolId: "SMME-BC-001",
    type: "Private Secondary",
    district: "Baguio Central",
    address: "Upper Session Road, Baguio City",
    contact: "registrar@sjhs.edu.ph",
    principal: "Dr. Mariel Santos",
    registrationStatus: "Approved",
    status: "Active",
    compliance: 94,
    pending: 2,
    lastActivity: "Permit document approved",
    programs: ["Junior High School", "Senior High School - ABM", "Senior High School - HUMSS"],
    services: ["Government Permit", "SHS Permit", "School Calendar"],
    documents: [
      {
        id: "sjh-permit-2026",
        title: "Government Permit to Operate SY 2026-2027",
        type: "Permit Application",
        status: "Approved",
        reviewer: "SMME Evaluator",
        submitted: "Jun 14, 2026",
        reviewed: "Jun 19, 2026",
        notes: [
          "Application form and school profile are complete.",
          "Inspection report is signed and attached.",
          "Permit may proceed to final release queue.",
        ],
      },
      {
        id: "sjh-calendar-2026",
        title: "School Calendar SY 2026-2027",
        type: "Calendar Submission",
        status: "Under review",
        reviewer: "Calendar Desk",
        submitted: "Jun 18, 2026",
        reviewed: "Pending",
        notes: ["Awaiting validation of total school days and activity schedule."],
      },
    ],
  },
  {
    slug: "pine-ridge-learning-center",
    name: "Pine Ridge Learning Center",
    schoolId: "SMME-BC-014",
    type: "Private Elementary",
    district: "Aurora Hill",
    address: "Outlook Drive, Baguio City",
    contact: "admin@pineridge.edu.ph",
    principal: "Ms. Liza Meneses",
    registrationStatus: "Rejected",
    status: "Needs action",
    compliance: 71,
    pending: 4,
    lastActivity: "Ownership document returned",
    programs: ["Kindergarten", "Elementary"],
    services: ["Change of Ownership", "Recognition"],
    documents: [
      {
        id: "prlc-ownership-2026",
        title: "Change of Ownership Supporting Documents",
        type: "Institutional Change",
        status: "For revision",
        reviewer: "Legal Review Desk",
        submitted: "Jun 11, 2026",
        reviewed: "Jun 20, 2026",
        notes: [
          "Board resolution needs notarized copy.",
          "Updated business permit should match the proposed school owner.",
          "Upload revised files before resubmission.",
        ],
      },
      {
        id: "prlc-recognition-2026",
        title: "Elementary Program Recognition File",
        type: "Recognition",
        status: "Returned",
        reviewer: "SMME Evaluator",
        submitted: "Jun 05, 2026",
        reviewed: "Jun 12, 2026",
        notes: ["Faculty roster and room utilization matrix are incomplete."],
      },
    ],
  },
  {
    slug: "baguio-hope-academy",
    name: "Baguio Hope Academy",
    schoolId: "SMME-BC-022",
    type: "Private Basic Education",
    district: "Loakan",
    address: "Loakan Road, Baguio City",
    contact: "records@bha.edu.ph",
    principal: "Mr. Aaron Chan",
    registrationStatus: "Pending",
    status: "For validation",
    compliance: 86,
    pending: 1,
    lastActivity: "Calendar validated",
    programs: ["Elementary", "Junior High School"],
    services: ["School Calendar", "TOSFI"],
    documents: [
      {
        id: "bha-calendar-2026",
        title: "School Calendar Validation Record",
        type: "Calendar Submission",
        status: "Approved",
        reviewer: "Calendar Desk",
        submitted: "Jun 10, 2026",
        reviewed: "Jun 18, 2026",
        notes: [
          "Required school day count is satisfied.",
          "Major activities are properly identified.",
        ],
      },
    ],
  },
  {
    slug: "cordillera-christian-institute",
    name: "Cordillera Christian Institute",
    schoolId: "SMME-BC-031",
    type: "Private Secondary",
    district: "Irisan",
    address: "Irisan Road, Baguio City",
    contact: "office@cci.edu.ph",
    principal: "Engr. Paul Ignacio",
    registrationStatus: "Approved",
    status: "Active",
    compliance: 89,
    pending: 3,
    lastActivity: "SHS permit inspection scheduled",
    programs: ["Junior High School", "Senior High School - STEM"],
    services: ["SHS Permit", "Government Permit"],
    documents: [
      {
        id: "cci-shs-permit-2026",
        title: "Senior High School STEM Permit Requirements",
        type: "SHS Permit",
        status: "Under review",
        reviewer: "SHS Program Desk",
        submitted: "Jun 17, 2026",
        reviewed: "Pending",
        notes: ["Laboratory inventory is queued for technical validation."],
      },
    ],
  },
];

export const requirements = [
  { icon: FileText, label: "Application Form", state: "Complete" },
  { icon: BookOpen, label: "School Profile", state: "Complete" },
  { icon: MapPin, label: "Site Validation", state: "Scheduled" },
  { icon: UploadCloud, label: "Supporting Files", state: "Needs update" },
  { icon: CheckCircle2, label: "Final Action", state: "Pending" },
];

export function getSchool(slug: string) {
  return schools.find((school) => school.slug === slug);
}

export function getDocument(id: string) {
  for (const school of schools) {
    const document = school.documents.find((item) => item.id === id);
    if (document) {
      return { school, document };
    }
  }

  return undefined;
}
