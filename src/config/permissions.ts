// ---------------------------------------------------------------------------
// Centralized permissions configuration
// ---------------------------------------------------------------------------

export const ADMIN_ROLES = ["administrator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type RoleName = "sportsman" | "parent" | "administrator";

export type Module =
  | "dashboard"
  | "athletes"
  | "programs"
  | "enrollments"
  | "evaluations"
  | "reports"
  | "competition-categories"
  | "users"
  | "meetings"
  | "inventory"
  | "categories"
  | "trainings"
  | "reports"
  | "profile"
  | "help";

export type Action = "view" | "create" | "edit" | "delete" | "export";

// Which roles can perform which actions on which modules
export const PERMISSIONS: Record<Module, Record<Action, readonly RoleName[]>> = {
  dashboard: {
    view: ["sportsman", "parent", "administrator"],
    create: [],
    edit: [],
    delete: [],
    export: [],
  },
  athletes: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  programs: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: [],
  },
  enrollments: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  evaluations: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  reports: {
    view: ["administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  "competition-categories": {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: [],
  },
  users: {
    view: ["administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  meetings: {
    view: ["administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  inventory: {
    view: ["administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  categories: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: [],
  },
  trainings: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: ["administrator"],
  },
  profile: {
    view: ["sportsman", "parent", "administrator"],
    create: [],
    edit: ["sportsman", "parent", "administrator"],
    delete: [],
    export: [],
  },
  help: {
    view: ["sportsman", "parent", "administrator"],
    create: [],
    edit: [],
    delete: [],
    export: [],
  },
};
