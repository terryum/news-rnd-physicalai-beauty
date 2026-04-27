const SUBSTACK_URL = process.env.NEXT_PUBLIC_SUBSTACK_URL;

interface Props {
  variant: "header" | "footer";
}

export function SubstackSubscribe({ variant }: Props) {
  if (!SUBSTACK_URL) return null;
  const base = SUBSTACK_URL.replace(/\/$/, "");
  const action = `${base}/api/v1/free`;

  if (variant === "header") {
    return (
      <form
        action={action}
        method="POST"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-1.5"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="뉴스레터 이메일"
          className="h-8 w-44 rounded-full border border-line-default bg-bg-surface px-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
        />
        <button
          type="submit"
          className="h-8 inline-flex items-center justify-center rounded-full bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          구독
        </button>
      </form>
    );
  }

  return (
    <form
      action={action}
      method="POST"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <span className="text-xs text-text-muted hidden sm:inline">
        매일 오전 8시 Substack으로 발행
      </span>
      <input
        type="email"
        name="email"
        required
        placeholder="이메일 주소"
        className="h-9 w-56 rounded-full border border-line-default bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
      />
      <button
        type="submit"
        className="h-9 inline-flex items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
      >
        구독
      </button>
    </form>
  );
}
