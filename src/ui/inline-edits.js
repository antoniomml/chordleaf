/** Keep active sheet drafts in the model without replacing their focused field.
 * Saving captures the draft; Escape restores the value from before editing. */
export function createInlineEdits({ changed, finished, invalid, committed }) {
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
  function finish({ render = true, cancel = false, restoreFocus = true } = {}) {
    if (!current) return true;
    if (!cancel && !capture({ report: true })) return false;
    const edit = current;
    current = undefined;
    if (cancel && edit.get() !== edit.original) {
      edit.set(edit.original);
      changed();
    }
    if (!cancel && edit.history) committed?.(edit.original, edit.get());
    if (render) finished({ restoreFocus });
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
      if (options.deferred) {
        input.setCustomValidity?.("");
        options.afterInput?.();
        return;
      }
      const accepted = capture();
      if (!accepted && options.rejectInvalid) {
        writeInput(current.accepted);
        input.setCustomValidity?.("");
      }
      if (accepted) options.afterInput?.();
    };
    input.onblur = (event) => {
      if (current?.input !== input) return;
      if (options.blurWithin?.contains(event.relatedTarget)) return;
      if (!finish({ restoreFocus: false }))
        finish({ cancel: true, restoreFocus: false });
    };
    input.onkeydown = (event) => {
      if (current?.input !== input) return;
      if (event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish({ cancel: true });
      } else if (
        event.key === "Backspace" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        options.backspace?.()
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else if (
        event.key === "Enter" &&
        options.enter &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        options.enter();
      } else if (
        event.key === "Enter" &&
        (!event.shiftKey || options.singleLine)
      ) {
        if (options.multiline && !event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
    };
    return true;
  }
  return {
    start,
    capture,
    finish,
    hasChanges: () =>
      Boolean(current?.history && current.get() !== current.original),
  };
}
