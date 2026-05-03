/**
 * Plays the shake-x keyframe on every element marked invalid inside a form.
 * Caller flags the wrapper of each field that failed validation with
 * `data-invalid="true"`, then invokes this — typically from the form's
 * onSubmit / validate-and-shake path. Re-running the animation requires
 * removing the class and forcing a reflow before re-adding it.
 */
export function shakeInvalidFields(formEl: HTMLFormElement) {
  const targets = formEl.querySelectorAll<HTMLElement>('[data-invalid="true"]');
  targets.forEach((el) => {
    el.classList.remove("animate-shake");
    void el.offsetWidth;
    el.classList.add("animate-shake");
  });
}

/**
 * Marks each field wrapper that has an entry in Formik's `errors` object as
 * invalid via the `data-invalid` attribute and triggers the shake on the
 * provided form element. Pairs with the per-field structure used in our
 * Formik forms (`<div data-field="name">` wraps each Label+Input+ErrorMessage).
 */
export function flagAndShakeInvalidFields(
  formEl: HTMLFormElement,
  errors: Record<string, unknown>,
) {
  formEl
    .querySelectorAll<HTMLElement>("[data-field]")
    .forEach((wrapper) => wrapper.removeAttribute("data-invalid"));

  Object.keys(errors).forEach((name) => {
    const wrapper = formEl.querySelector<HTMLElement>(
      `[data-field="${CSS.escape(name)}"]`,
    );
    if (wrapper) wrapper.setAttribute("data-invalid", "true");
  });

  shakeInvalidFields(formEl);
}
