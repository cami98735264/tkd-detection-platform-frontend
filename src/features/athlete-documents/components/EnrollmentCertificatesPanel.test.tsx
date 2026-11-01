import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ certificates: vi.fn(), downloadCertificate: vi.fn() }));
vi.mock("../api/athleteDocumentsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/athleteDocumentsApi")>();
  return { ...actual, athleteDocumentsApi: h };
});

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import EnrollmentCertificatesPanel from "./EnrollmentCertificatesPanel";

const cert = {
  enrollment_id: 5,
  program_name: "Formativo infantil",
  start_date: "2026-02-01",
  end_date: null,
  status: "active",
  download_url: "/api/v1/enrollments/5/enrollment-certificate/",
  last_issued_at: null,
  last_code: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.downloadCertificate.mockResolvedValue(undefined);
});

describe("EnrollmentCertificatesPanel", () => {
  it("lists certifiable enrollments and downloads the certificate", async () => {
    h.certificates
      .mockResolvedValueOnce([cert])
      .mockResolvedValueOnce([
        { ...cert, last_code: "CI-2026-000123", last_issued_at: "2026-11-01" },
      ]);
    render(
      <FeedbackProvider>
        <EnrollmentCertificatesPanel athleteId={3} />
      </FeedbackProvider>,
    );
    expect(await screen.findByText("Formativo infantil")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Descargar constancia/ }));
    await waitFor(() => expect(h.downloadCertificate).toHaveBeenCalledWith(cert));
    expect(await screen.findByText(/CI-2026-000123/)).toBeInTheDocument();
    expect(h.certificates).toHaveBeenCalledWith(3);
  });

  it("shows an empty state", async () => {
    h.certificates.mockResolvedValue([]);
    render(
      <FeedbackProvider>
        <EnrollmentCertificatesPanel athleteId={3} bare />
      </FeedbackProvider>,
    );
    expect(await screen.findByText("Sin inscripciones certificables")).toBeInTheDocument();
  });
});
