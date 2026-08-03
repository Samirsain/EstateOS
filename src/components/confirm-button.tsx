"use client";

import type { ComponentProps } from "react";
import { Button } from "./ui";

/**
 * A submit button that asks for confirmation before letting the enclosing
 * form's action run — used for destructive actions like deleting a record.
 */
export function ConfirmButton({
  confirmMessage,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
