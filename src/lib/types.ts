import type { FUNCTIONS, SENIORITIES, REGIONS, WORK_MODES } from "./constants";
export type ListingStatus = "active" | "hidden" | "closed";
export interface ListingBase {
  id: string;
  slug: string;
  function: (typeof FUNCTIONS)[number];
  seniority: (typeof SENIORITIES)[number];
  location: string;
  regions: (typeof REGIONS)[number][];
  work_modes: (typeof WORK_MODES)[number][];
  skills: string[];
  note: string | null;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  reminder_sent_at: string | null;
  closed_at: string | null;
}
export interface Candidate extends ListingBase {
  full_name: string;
  linkedin_url: string;
  pandadoc_role: string | null;
  target_role: string;
  relocation: boolean | null;
  open_to_work_post_url: string | null;
}
export interface Role extends ListingBase {
  company_name: string;
  company_website: string | null;
  contact_name: string;
  contact_linkedin_url: string | null;
  role_title: string;
  vacancy_url: string;
  hiring_post_url: string | null;
  visa_support: string | null;
}
export type PublicListing = Candidate | Role;
export type Owned<T> = T & { owner_id: string };
export function isCandidate(listing: PublicListing): listing is Candidate {
  return "full_name" in listing;
}
export interface DirectoryData {
  asOf: number;
  people: Candidate[];
  roles: Role[];
  unavailable: boolean;
  demo: boolean;
  configured: boolean;
}
