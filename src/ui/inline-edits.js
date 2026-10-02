/** Keep active sheet drafts in the model without replacing their focused field.
 * Saving captures the draft; Escape restores the value from before editing. */
export function createInlineEdits({ changed, finished, invalid }) {
  let current;
  function capture({ report = false } = {}) {
    if (!current) return true;
    const { input, read, get, set, validate } = current;
    try {
      const value = read();
      validate?.(value);
      input.setCustomValidity?.("");
      if (get() !== value) {
        set(value);
        changed();
      }
      current.accepted = current.readInput();
      return true;
    } catch (error) {
      input.setCustomValidity?.(error.message);
      invalid(error.message);
      if (report) input.reportValidity?.();
      return false;
    }
  }
  function finish({ render = true, cancel = false } = {}) {
    if (!current) return true;
    if (!cancel && !capture({ report: true })) return false;
    const edit = current;
    current = undefined;
    if (cancel && edit.get() !== edit.original) {
      edit.set(edit.original);
      changed();
    }
    if (render) finished();
    return true;
  }
  function start(input, options) {
    if (!finish()) return false;
    const readInput = options.readInput ?? (() => input.value);
    const writeInput = options.writeInput ?? ((value) => (input.value = value));
    current = {
      ...options,
      input,
      original: options.get(),
      accepted: readInput(),
      readInput,
    };
    input.oninput = () => {
      if (current?.input !== input) return;
      if (!capture() && options.rejectInvalid) {
        writeInput(current.accepted);
        input.setCustomValidity?.("");
      }
    };
    input.onblur = () => {
      if (current?.input !== input) return;
      if (!finish()) finish({ cancel: true });
    };
    input.onkeydown = (event) => {
      if (current?.input !== input) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish({ cancel: true });
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
    };
    return true;
  }
  return { start, capture, finish };
}
