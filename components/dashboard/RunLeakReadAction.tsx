"use client";

import { useState, useTransition } from "react";

type RunLeakReadActionState = {
  message: string;
  ok: boolean | null;
  summary: string | null;
};

type RunLeakReadActionProps = Readonly<{
  action: () => Promise<RunLeakReadActionState>;
  initialState: RunLeakReadActionState;
}>;

export function RunLeakReadAction({
  action,
  initialState,
}: RunLeakReadActionProps) {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="rev-label">Manual read</p>
          <p className="mt-1.5 text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
            Refresh leak signals from your latest imported data.
          </p>
        </div>
        <button
          className="rev-action-button min-h-8 px-3.5 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setState(await action());
            });
          }}
          type="button"
        >
          {isPending ? "Running..." : "Run leak read"}
        </button>
      </div>

      <p
        className={`mt-2.5 text-[11px] leading-[1.45] ${
          state.ok === false
            ? "text-[#ff9aa8]"
            : state.ok === true
              ? "text-[color:var(--accent-light)]"
              : "text-[color:var(--text-subtle)]"
        }`}
      >
        {state.message}
      </p>
      {state.summary ? (
        <p className="mt-1 text-[10px] leading-[1.45] text-[color:var(--text-subtle)]">
          {state.summary}
        </p>
      ) : null}
    </div>
  );
}
