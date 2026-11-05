import type React from 'react';

/**
 * Disables all the fields of its children on the shared chart of a partner device. Else it adds
 * no element, so that the form keeps its accessibility tree.
 */
export const ReadOnlyFields: React.FC<{ readOnly: boolean; children: React.ReactNode }> = ({
  readOnly,
  children,
}) =>
  readOnly ? (
    <fieldset className="observation-fieldset" disabled>
      {children}
    </fieldset>
  ) : (
    children
  );
