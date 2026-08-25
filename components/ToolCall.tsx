import { cn } from "@/lib/utils";

/** Native <details> — no accordion library needed for a disclosure. */
export const ToolCall = ({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: string;
  input: unknown;
  output?: unknown;
  errorText?: string;
}) => {
  const failed = state === "output-error";
  const done = state === "output-available";

  return (
    <details
      className={cn(
        "max-w-[85%] rounded-lg border px-3 py-1.5 text-xs",
        failed && "border-destructive/50 bg-destructive/10",
      )}
    >
      <summary className="cursor-pointer list-none select-none text-muted-foreground marker:hidden">
        <span
          className={cn(
            "mr-2 inline-block size-1.5 rounded-full align-middle",
            failed
              ? "bg-destructive"
              : done
                ? "bg-muted-foreground/50"
                : "animate-pulse bg-foreground",
          )}
        />
        {failed ? `${name} failed` : done ? name : `${name}...`}
      </summary>
      <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
        {errorText ?? JSON.stringify(output ?? input, null, 2)}
      </pre>
    </details>
  );
}
