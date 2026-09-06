export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/70 py-6 text-xs text-muted-foreground">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>© {currentYear} Vocaura — Professional English Trainer</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-border/60 bg-muted/40 text-muted-foreground">
            v0.1.0 MVP
          </span>
        </div>
      </div>
    </footer>
  );
}
