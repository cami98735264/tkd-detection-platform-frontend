// ---------------------------------------------------------------------------
// Centralized permissions configuration
// ---------------------------------------------------------------------------

export const ADMIN_ROLES = ["administrator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PARENT_ROLES = ["parent"] as const;
export type ParentRole = (typeof PARENT_ROLES)[number];

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
  | "trainings"
  | "profile"
  | "help"
  | "attendance"
  | "technical-evaluation";

export type Action = "view" | "create" | "edit" | "delete" | "export";

// Which roles can perform which actions on which modules. The router derives
// its RoleRoute guards from the `view` (or a given) action, so this matrix and
// the routes cannot drift apart.
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
  // The categories page is an admin CRUD screen (admin navigation only). Other
  // roles still read categories through the API where forms need them.
  "competition-categories": {
    view: ["administrator"],
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
    view: ["sportsman", "parent", "administrator"],
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
  attendance: {
    view: ["sportsman", "parent", "administrator"],
    create: ["administrator"],
    edit: ["administrator"],
    delete: ["administrator"],
    export: [],
  },
  // Athletes record their own kicks; parents record/consent for linked minors.
  // Administrators have no technical-evaluation screen.
  "technical-evaluation": {
    view: ["sportsman", "parent"],
    create: ["sportsman", "parent"],
    edit: [],
    delete: [],
    export: [],
  },
};

/** Roles allowed to perform `action` (default "view") on `module`. */
export function rolesFor(module: Module, action: Action = "view"): readonly RoleName[] {
  return PERMISSIONS[module][action];
}
