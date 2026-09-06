/** Bridge to the shared widget's editable reply address, not an auth credential. */
export function createFeedbackEmailSync() {
  let email: string | undefined;
  let seen = new WeakSet<HTMLInputElement>();
  return {
    setAccount(value: string | null) {
      const next = value ?? '';
      if (next !== email) { email = next; seen = new WeakSet(); }
    },
    apply(input: HTMLInputElement) {
      if (email === undefined || seen.has(input)) return;
      seen.add(input);
      input.value = email;
      // The shared widget stores its own email state in this input listener.
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
  };
}
