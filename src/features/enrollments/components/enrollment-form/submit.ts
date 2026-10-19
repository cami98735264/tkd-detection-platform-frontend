// Submission steps of the enrollment wizard, as plain async functions of a
// snapshot of the wizard state (extracted from EnrollmentFormSheet, unchanged).
import { athletesApi } from "@/features/athletes/api/athletesApi";
import {
  buildRegistrationPayload,
  type AthletePersonalDataState,
  type ParentAccountState,
} from "@/features/athletes/components/sections/types";
import { parentAthletesApi } from "@/features/parent/api/parentAthletesApi";
import { usersApi } from "@/features/users/api/usersApi";

import type { AthleteMode, EnrollmentExtras } from "./model";

export interface WizardSnapshot {
  athleteMode: AthleteMode;
  linkedAthleteId: number | null;
  personal: AthletePersonalDataState;
  parent: ParentAccountState;
  extras: EnrollmentExtras;
  isMinor: boolean;
  isEdit: boolean;
}

export async function resolveAthleteIdFor(w: WizardSnapshot): Promise<number> {
  const { athleteMode, linkedAthleteId, personal, parent, isMinor } = w;
  if (athleteMode === "link") {
    if (linkedAthleteId == null) {
      throw new Error("Selecciona un deportista.");
    }
    return linkedAthleteId;
  }
  // Atomic: creates sportsman user + athlete + (if minor) parent + ParentAthlete.
  const created = await athletesApi.register(
    buildRegistrationPayload(personal, isMinor ? parent : null),
  );
  return created.id;
}

export async function linkParentForExistingAthleteFor(
  w: WizardSnapshot,
  athleteId: number,
): Promise<void> {
  const { athleteMode, parent, isMinor, isEdit } = w;
  if (!isMinor || isEdit) return;
  if (athleteMode === "register") return; // already handled atomically above
  if (parent.parent_mode === "link") {
    await parentAthletesApi.register({
      athlete: athleteId,
      parent_relationship: parent.parent_relationship as "mother" | "father" | "guardian",
      parent_user_id: parent.parent_user_id,
    });
  } else {
    await parentAthletesApi.register({
      athlete: athleteId,
      parent_relationship: parent.parent_relationship as "mother" | "father" | "guardian",
      parent_full_name: parent.parent_full_name.trim(),
      parent_email: parent.parent_email.trim(),
      parent_password: parent.parent_password,
    });
  }
}

export async function buildEnrollmentPayloadFor(w: WizardSnapshot, athleteId: number) {
  const { parent, extras, isMinor, isEdit } = w;
  // The legacy guardian_* fields on the enrollment record act as a snapshot of
  // emergency-contact info. We populate them from the parent state when available
  // so the enrollment record remains self-contained even if the parent account
  // is later removed.
  let guardian_full_name = "";
  let guardian_email = "";
  let guardian_relationship = "";

  if (isMinor && !isEdit) {
    guardian_relationship = parent.parent_relationship;
    if (parent.parent_mode === "create") {
      guardian_full_name = parent.parent_full_name.trim();
      guardian_email = parent.parent_email.trim();
    } else if (parent.parent_user_id != null) {
      const user = await usersApi.get(parent.parent_user_id);
      guardian_full_name = user.full_name;
      guardian_email = user.email;
    }
  }

  return {
    athlete_id: athleteId,
    program_id: extras.program_id!,
    start_date: extras.start_date,
    end_date: extras.end_date || null,
    notes: extras.notes,
    blood_type: extras.blood_type,
    certificado_medico: extras.certificado_medico ?? undefined,
    guardian_full_name,
    guardian_documento: extras.guardian_documento,
    guardian_relationship,
    guardian_email,
    guardian_address: extras.guardian_address,
    acepta_terminos: extras.acepta_terminos,
    acepta_datos: extras.acepta_datos,
    acepta_imagenes: extras.acepta_imagenes,
    confirmacion_precision: extras.confirmacion_precision,
  };
}
