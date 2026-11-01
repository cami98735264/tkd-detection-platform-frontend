// Club profile singleton (contract Addendum B.2). The signature image is
// private: it is only reachable through the authenticated endpoint.
import { axiosInstance, http } from "@/lib/http";
import { fetchFile } from "@/lib/download";
import type { ClubProfile } from "@/types/entities";

import {
  SIGNATURE_ENDPOINT,
  normalizeClubProfile,
  type ClubProfileUpdatePayload,
} from "../lib/clubProfile";

export const clubProfileApi = {
  /** GET /club-profile/ (any authenticated user). */
  get: (): Promise<ClubProfile> => http.get<unknown>("/club-profile/").then(normalizeClubProfile),

  /** PATCH /club-profile/ with JSON fields (admin). */
  update: (payload: ClubProfileUpdatePayload): Promise<ClubProfile> =>
    http.patch<unknown>("/club-profile/", payload).then(normalizeClubProfile),

  /** Upload/replace the legal representative's signature (multipart, admin). */
  uploadSignature: (file: File): Promise<ClubProfile> => {
    const form = new FormData();
    form.append("signature", file);
    return axiosInstance
      .patch<unknown>("/club-profile/", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      })
      .then((r) => normalizeClubProfile(r.data));
  },

  /** Delete the stored signature (admin). */
  removeSignature: (): Promise<ClubProfile> =>
    http.patch<unknown>("/club-profile/", { remove_signature: true }).then(normalizeClubProfile),

  /** Signature image as a Blob (admin) — for an in-page preview. */
  fetchSignature: (signatureUrl?: string | null): Promise<Blob> =>
    fetchFile(signatureUrl || SIGNATURE_ENDPOINT, "firma.png").then((f) => f.blob),
};
