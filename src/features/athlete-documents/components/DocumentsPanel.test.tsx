import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AthleteDocument } from "../api/athleteDocumentsApi";

const h = vi.hoisted(() => ({
  list: vi.fn(),
  checklist: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  review: vi.fn(),
  download: vi.fn(),
  downloadWaiverTemplate: vi.fn(),
}));

vi.mock("../api/athleteDocumentsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/athleteDocumentsApi")>();
  return { ...actual, athleteDocumentsApi: h };
});

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import DocumentsPanel from "./DocumentsPanel";

const insurance: AthleteDocument = {
  id: 12,
  athlete: 3,
  athlete_name: "Ana Gómez",
  doc_type: "sports_insurance",
  doc_type_display: "Seguro deportivo",
  title: "Póliza 2026",
  original_filename: "poliza.pdf",
  size: 120334,
  status: "pending",
  status_display: "Pendiente",
  insurer: "SURA",
  policy_number: "123",
  valid_from: "2026-01-01",
  valid_until: "2026-12-31",
  source: "document",
  download_url: "/api/v1/athlete-documents/12/download/",
  can_delete: true,
  uploaded_by_name: "Luis Gómez",
  created_at: "2026-10-01T10:00:00Z",
};

const legacy: AthleteDocument = {
  id: "enrollment-5",
  athlete: 3,
  doc_type: "medical_certificate",
  status: "approved",
  source: "enrollment",
  download_url: "/api/v1/enrollments/5/certificate/",
  can_delete: false,
};

function renderPanel(canReview = false) {
  return render(
    <FeedbackProvider>
      <DocumentsPanel athleteId={3} athleteName="Ana Gómez" canReview={canReview} />
    </FeedbackProvider>,
  );
}

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g.ResizeObserver ??= NoopObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  h.list.mockResolvedValue([insurance, legacy]);
  h.checklist.mockResolvedValue({
    athlete: 3,
    complete: false,
    items: [
      {
        doc_type: "medical_certificate",
        label: "Certificado médico",
        required: true,
        status: "approved",
        document_id: "enrollment-5",
      },
      {
        doc_type: "sports_insurance",
        label: "Seguro deportivo",
        required: true,
        status: "pending",
        document_id: 12,
      },
      {
        doc_type: "liability_waiver",
        label: "Carta de exoneración",
        required: true,
        status: "missing",
        document_id: null,
      },
    ],
  });
  h.download.mockResolvedValue(undefined);
  h.downloadWaiverTemplate.mockResolvedValue(undefined);
  h.remove.mockResolvedValue(undefined);
});

describe("DocumentsPanel", () => {
  it("shows the checklist with statuses and the uploaded documents", async () => {
    renderPanel();
    const checklist = await screen.findByRole("list", { name: "Lista de chequeo de documentos" });
    expect(within(checklist).getByText("Aprobado")).toBeInTheDocument();
    expect(within(checklist).getByText("Pendiente de revisión")).toBeInTheDocument();
    expect(within(checklist).getByText("Falta")).toBeInTheDocument();
    expect(screen.getByText("Documentación pendiente")).toBeInTheDocument();
    expect(screen.getByText(/Aseguradora: SURA · Póliza: 123/)).toBeInTheDocument();
    expect(screen.getByText("Desde inscripción")).toBeInTheDocument();
    // Families cannot review; the legacy enrollment certificate cannot be deleted.
    expect(screen.queryByRole("button", { name: /Revisar/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Eliminar documento" })).toHaveLength(1);
  });

  it("downloads a document and the blank waiver template", async () => {
    renderPanel();
    await screen.findByText("Póliza 2026 · 118 KB");
    fireEvent.click(screen.getAllByRole("button", { name: /^Descargar$/ })[0]);
    await waitFor(() => expect(h.download).toHaveBeenCalledWith(insurance));
    fireEvent.click(screen.getByRole("button", { name: /Formato carta de exoneración/ }));
    await waitFor(() => expect(h.downloadWaiverTemplate).toHaveBeenCalledWith(3));
  });

  it("rejects an invalid file before uploading", async () => {
    renderPanel();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Subir Carta de exoneración de responsabilidad (firmada)",
      }),
    );
    const input = await screen.findByLabelText("Archivo *");
    const big = new File(["x"], "carta.docx", { type: "application/msword" });
    fireEvent.change(input, { target: { files: [big] } });
    fireEvent.click(screen.getByRole("button", { name: "Subir documento" }));
    expect(
      await screen.findByText("Formato no permitido. Sube un PDF, JPG o PNG."),
    ).toBeInTheDocument();
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("uploads a valid file with the preselected type and reloads", async () => {
    h.upload.mockResolvedValue({ ...insurance, id: 13, doc_type: "liability_waiver" });
    renderPanel();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Subir Carta de exoneración de responsabilidad (firmada)",
      }),
    );
    const file = new File(["%PDF"], "carta.pdf", { type: "application/pdf" });
    fireEvent.change(await screen.findByLabelText("Archivo *"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Subir documento" }));
    await waitFor(() =>
      expect(h.upload).toHaveBeenCalledWith(3, { doc_type: "liability_waiver", file }),
    );
    await waitFor(() => expect(h.list).toHaveBeenCalledTimes(2));
  });

  it("lets an admin reject with notes", async () => {
    h.review.mockResolvedValue({ ...insurance, status: "rejected" });
    renderPanel(true);
    fireEvent.click(await screen.findByRole("button", { name: /Revisar/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Rechazar/ }));
    expect(await screen.findByText("Indica el motivo del rechazo.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Observaciones"), {
      target: { value: "Póliza vencida" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }));
    await waitFor(() =>
      expect(h.review).toHaveBeenCalledWith(12, {
        status: "rejected",
        review_notes: "Póliza vencida",
      }),
    );
  });

  it("deletes after confirmation", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar documento" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith(12));
  });

  it("derives the checklist from the documents when the endpoint has none", async () => {
    h.checklist.mockRejectedValue(new Error("404"));
    h.list.mockResolvedValue([legacy]);
    renderPanel();
    const checklist = await screen.findByRole("list", { name: "Lista de chequeo de documentos" });
    expect(within(checklist).getByText("Aprobado")).toBeInTheDocument();
    // Medical certificate approved; insurance, waiver and the two B.6 annexes missing.
    expect(within(checklist).getAllByText("Falta")).toHaveLength(4);
    expect(
      within(checklist).getByText("Documento de identidad (foto legible)"),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText("Certificado de afiliación EPS (ADRES)"),
    ).toBeInTheDocument();
  });
});
