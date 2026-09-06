"use client";

import { FormEvent, useEffect, useState } from "react";

type ApiHealth = {
  status: string;
  service: string;
};

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  priority: "low" | "medium" | "high" | "critical" | null;
  category: string | null;
  ai_summary: string | null;
};

type IconName =
  | "activity"
  | "arrow-right"
  | "check"
  | "chevron-down"
  | "clock"
  | "inbox"
  | "plus"
  | "ticket"
  | "trash";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
    "arrow-right": <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    "chevron-down": <path d="m7 10 5 5 5-5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    ticket: (
      <>
        <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V9a3 3 0 0 0 0 6v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V15a3 3 0 0 0 0-6Z" />
        <path d="M13 9v6" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7" />
        <path d="M10 11v5m4-5v5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  );
}

const statusStyles: Record<string, string> = {
  new: "border-sky-800/80 bg-sky-950/60 text-sky-300",
  in_progress: "border-amber-800/80 bg-amber-950/60 text-amber-300",
  resolved: "border-emerald-800/80 bg-emerald-950/60 text-emerald-300",
};

const priorityStyles: Record<string, string> = {
  low: "border-slate-700 bg-slate-900 text-slate-300",
  medium: "border-amber-800/80 bg-amber-950/60 text-amber-300",
  high: "border-orange-800/80 bg-orange-950/60 text-orange-300",
  critical: "border-rose-800/80 bg-rose-950/60 text-rose-300",
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Home() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function checkBackend() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`);

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data: ApiHealth = await response.json();
      setHealth(data);
    } catch {
      setHealthError("Unable to connect to backend");
    }
  }

  async function getTickets() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets`);

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data: Ticket[] = await response.json();
      setTickets(data);
    } catch {
      setTicketsError("Unable to connect to backend");
    }
  }

  async function updateTicketStatus(ticketId: number, newStatus: Ticket["status"]) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      await response.json();

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      await getTickets();
    } catch (error) {
      console.error(error);
      setTicketsError("Unable to update ticket status");
    }
  }

  async function deleteTicket(ticketId: number) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      await getTickets();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    // These functions update state only after their network requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkBackend();
    getTickets();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);
    setCreatedTicket(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && Array.isArray(data.detail)) {
          const validationMessages = data.detail.map(
            (error: { loc: (string | number)[]; msg: string }) => {
              const field = error.loc[error.loc.length - 1];
              return `${field}: ${error.msg}`;
            }
          );

          throw new Error(validationMessages.join(" | "));
        }

        throw new Error(`Request failed with status ${response.status}`);
      }

      const ticket: Ticket = data;

      setCreatedTicket(ticket);
      await getTickets();
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to create ticket");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const newCount = tickets.filter((ticket) => ticket.status === "new").length;
  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;
  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "resolved"
  ).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[#090d15]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#090d15]"
            href="#top"
            aria-label="SignalDesk home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform group-hover:-translate-y-0.5">
              <Icon name="activity" className="h-[19px] w-[19px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[-0.01em] text-slate-50">
                SignalDesk
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Support operations
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 rounded-lg bg-white/[0.055] p-1 sm:flex" aria-label="Primary navigation">
            <a
              className="rounded-md bg-slate-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              href="#tickets"
              aria-current="page"
            >
              Tickets
            </a>
            <a
              className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              href="#new-ticket"
            >
              New ticket
            </a>
          </nav>

          <div
            className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                health
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  : healthError
                    ? "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]"
                    : "animate-pulse bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]"
              }`}
            />
            <span className="hidden sm:block">
              <span className="block text-[11px] font-semibold leading-none text-slate-200">
                {health ? "Systems operational" : healthError ? "API unavailable" : "Connecting"}
              </span>
              <span className="mt-1 block text-[10px] leading-none text-slate-500">
                {health ? health.service : healthError ? "Check your connection" : "Checking service"}
              </span>
            </span>
            <span className="sr-only">
              {health ? `${health.service}: ${health.status}` : healthError ?? "Checking backend"}
            </span>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="flex flex-col gap-6 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-indigo-400">
              Support workspace
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-slate-50 sm:text-4xl">
              Keep every customer issue moving.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Create, monitor, and resolve support requests from one focused workspace.
            </p>
          </div>
          <a
            href="#new-ticket"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px sm:w-auto"
          >
            <Icon name="plus" className="h-4 w-4" />
            Create ticket
          </a>
        </section>

        <section className="grid grid-cols-2 overflow-hidden border-x border-b border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4" aria-label="Ticket overview">
          <div className="border-b border-r border-[var(--border)] p-4 sm:border-b-0 sm:p-5">
            <p className="text-xs font-medium text-slate-400">Total tickets</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-50">{tickets.length}</p>
          </div>
          <div className="border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r sm:p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <p className="text-xs font-medium text-slate-400">New</p>
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-50">{newCount}</p>
          </div>
          <div className="border-r border-[var(--border)] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-xs font-medium text-slate-400">In progress</p>
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-50">{inProgressCount}</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-slate-400">Resolved</p>
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-50">{resolvedCount}</p>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.35fr)]">
          <section id="new-ticket" className="scroll-mt-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-300">
                  <Icon name="plus" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-50">Create a ticket</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-400">
                    Capture the issue so your team can take action.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-slate-200" htmlFor="title">
                  Ticket title <span className="text-rose-400" aria-hidden="true">*</span>
                </label>
                <p id="title-help" className="mt-1 text-xs leading-5 text-slate-500">
                  A short summary of what needs attention.
                </p>
                <input
                  id="title"
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-[#0b1019] px-3.5 py-2.5 text-sm text-slate-100 shadow-sm outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/15"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Checkout fails after payment"
                  aria-describedby="title-help"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200" htmlFor="description">
                  Description <span className="text-rose-400" aria-hidden="true">*</span>
                </label>
                <p id="description-help" className="mt-1 text-xs leading-5 text-slate-500">
                  Include the context and impact your team needs.
                </p>
                <textarea
                  id="description"
                  className="mt-2 min-h-32 w-full resize-y rounded-lg border border-slate-700 bg-[#0b1019] px-3.5 py-3 text-sm leading-6 text-slate-100 shadow-sm outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/15"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe what happened, who is affected, and the expected outcome."
                  aria-describedby="description-help"
                  required
                />
              </div>

              {submitError && (
                <div className="rounded-lg border border-rose-900 bg-rose-950/50 px-3.5 py-3 text-sm leading-5 text-rose-300" role="alert">
                  <span className="font-semibold">Ticket not created.</span> {submitError}
                </div>
              )}

              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Creating ticket…
                  </>
                ) : (
                  <>
                    Create ticket
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {createdTicket && (
              <div className="border-t border-[var(--border)] bg-emerald-950/25 p-5 sm:p-6" role="status" aria-live="polite">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-900/70 text-emerald-300">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-emerald-200">Ticket created successfully</h3>
                    <p className="mt-1 truncate text-sm font-medium text-emerald-100">{createdTicket.title}</p>
                    <p className="mt-1 text-xs text-emerald-400">
                      #{createdTicket.id} · {formatStatus(createdTicket.status)} · {new Date(createdTicket.created_at).toLocaleString()}
                    </p>
                    {createdTicket.priority && (
                      <p className="mt-2 text-xs text-emerald-300">
                        AI priority: {formatStatus(createdTicket.priority)}
                        {createdTicket.category
                          ? ` · ${formatStatus(createdTicket.category)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section id="tickets" className="scroll-mt-24 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-300">
                  <Icon name="inbox" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-50">Ticket queue</h2>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-300">
                      {tickets.length}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-400">Review requests and keep their status current.</p>
                </div>
              </div>
              {tickets.length > 0 && (
                <p className="pl-12 text-xs font-medium text-slate-500 sm:pl-0">Status updates save automatically</p>
              )}
            </div>

            {ticketsError && (
              <div className="m-5 rounded-lg border border-rose-900 bg-rose-950/50 p-4 sm:m-6" role="alert">
                <div className="flex gap-3">
                  <span className="mt-0.5 text-rose-400"><Icon name="activity" className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-rose-200">Couldn’t load the ticket queue</h3>
                    <p className="mt-1 text-sm leading-5 text-rose-300">{ticketsError}. Check the API connection and try again.</p>
                  </div>
                </div>
              </div>
            )}

            {!ticketsError && tickets.length === 0 && (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-800 text-slate-400">
                  <Icon name="ticket" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-slate-100">Your queue is clear</h3>
                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-400">
                  New support requests will appear here as soon as they’re created.
                </p>
                <a className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]" href="#new-ticket">
                  <Icon name="plus" className="h-4 w-4" />
                  Create the first ticket
                </a>
              </div>
            )}

            {tickets.length > 0 && (
              <div className="divide-y divide-[var(--border)]">
                {tickets.map((ticket) => (
                  <article key={ticket.id} className="group p-5 transition-colors hover:bg-white/[0.025] sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold tabular-nums text-slate-500">#{ticket.id}</span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusStyles[ticket.status] ?? "border-slate-700 bg-slate-900 text-slate-300"}`}>
                              {formatStatus(ticket.status)}
                            </span>
                            {ticket.priority && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${priorityStyles[ticket.priority] ?? "border-slate-700 bg-slate-900 text-slate-300"}`}>
                                {formatStatus(ticket.priority)} priority
                              </span>
                            )}
                            {ticket.category && (
                              <span className="inline-flex items-center rounded-full border border-indigo-900/80 bg-indigo-950/50 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                                {formatStatus(ticket.category)}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 break-words text-base font-semibold leading-6 tracking-[-0.01em] text-slate-100">
                            {ticket.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-rose-900 hover:bg-rose-950/60 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                          onClick={() => deleteTicket(ticket.id)}
                          aria-label={`Delete ticket ${ticket.title}`}
                          title="Delete ticket"
                        >
                          <Icon name="trash" className="h-[18px] w-[18px]" />
                        </button>
                      </div>

                      <p className="break-words text-sm leading-6 text-slate-300">{ticket.description}</p>

                      {ticket.ai_summary && (
                        <div className="rounded-lg border border-indigo-900/70 bg-indigo-950/30 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-400">
                            AI summary
                          </p>
                          <p className="mt-1 text-sm leading-6 text-indigo-100">
                            {ticket.ai_summary}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Icon name="clock" className="h-4 w-4" />
                          <span>{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                        <div className="relative w-full sm:w-auto">
                          <label className="sr-only" htmlFor={`status-${ticket.id}`}>
                            Status for {ticket.title}
                          </label>
                          <select
                            id={`status-${ticket.id}`}
                            className="min-h-10 w-full appearance-none rounded-lg border border-slate-700 bg-[#0b1019] py-2 pl-3 pr-9 text-sm font-semibold text-slate-200 shadow-sm outline-none transition hover:border-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/15 sm:w-auto"
                            value={ticket.status}
                            onChange={(event) =>
                              updateTicketStatus(ticket.id, event.target.value as Ticket["status"])
                            }
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
