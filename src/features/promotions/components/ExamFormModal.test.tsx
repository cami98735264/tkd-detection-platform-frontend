import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ createExam: vi.fn(), updateExam: vi.fn() }));

vi.mock("../api/promotionsApi", () => ({
  promotionsApi: { createExam: h.createExam, updateExam: h.updateExam },
}));
// The roster search is not under test: a stub that picks athlete 5.
vi.mock("@/features/athletes/components/AthletePicker", () => ({
  AthletePicker: ({ onChange }: { onChange: (v: number) => void }) => (
    <button type="button" onClick={() => onChange(5)}>
      elegir deportista
    </button>
  ),
}));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import type { ExamCriteria } from "../types";
import ExamFormModal from "./ExamFormModal";

const criteria: ExamCriteria = {
  criteria: [
    { criterion: "Poomsae", score: 0, weight: 1 },
    { criterion: "Kyorugi (combate)", score: 0, weight: 1 },
  ],
  passing_score: 70,
  admin_checks: [
    { key: "documents_complete", label: "Documentos completos" },
    { key: "fees_ok", label: "Pagos al día" },
  ],
};

function renderModal(onSaved = vi.fn()) {
  render(
    <FeedbackProvider>
      <ExamFormModal
        open
        onOpenChange={() => {}}
        exam={null}
        criteria={criteria}
        belts={[
          { id: 1, nombre: "Blanco", grado: 1 },
          { id: 2, nombre: "Amarillo", grado: 2 },
        ]}
        onSaved={onSaved}
      />
    </FeedbackProvider>,
  );
  return onSaved;
}

beforeAll(() => {
  // Radix Checkbox measures itself; jsdom has no ResizeObserver.
  (globalThis as Record<string, unknown>).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  h.createExam.mockReset().mockResolvedValue({ id: 9 });
});

describe("ExamFormModal", () => {
  it("previews the weighted score against the passing score", () => {
    renderModal();
    const preview = screen.getByTestId("exam-preview");
    expect(preview).toHaveTextContent("No alcanza la nota mínima");

    fireEvent.change(screen.getByLabelText("Nota Poomsae"), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText("Nota Kyorugi (combate)"), { target: { value: "70" } });
    expect(preview).toHaveTextContent("80");
    expect(preview).toHaveTextContent("Faltan requisitos administrativos");

    fireEvent.click(screen.getByRole("checkbox", { name: "Documentos completos" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Pagos al día" }));
    expect(preview).toHaveTextContent("quedaría aprobado");
  });

  it("sends only the admin checks the maestro touched on create", async () => {
    const onSaved = renderModal();
    fireEvent.click(screen.getByText("elegir deportista"));
    fireEvent.change(screen.getByLabelText("Cinturón a obtener"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Nota Poomsae"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Pagos al día" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar examen" }));

    await waitFor(() => expect(h.createExam).toHaveBeenCalled());
    const payload = h.createExam.mock.calls[0][0];
    expect(payload).toMatchObject({ athlete: 5, to_belt: 2, passing_score: 70 });
    expect(payload.admin_checks).toEqual({ fees_ok: true });
    expect(payload.technical_scores[0]).toMatchObject({
      criterion: "Poomsae",
      score: 75,
      weight: 1,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 9 }));
  });
});
