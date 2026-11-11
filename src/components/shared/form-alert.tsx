/** Form-level error, announced to assistive technology when it appears. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm bg-danger/12 px-3.5 py-2.5 text-body-sm text-danger"
    >
      {message}
    </p>
  );
}
