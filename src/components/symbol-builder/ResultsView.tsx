import { ArrowLeft, Download, FileDown, Info, RefreshCcw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { renderSvgToPng, saveImage } from "@/lib/export-image";
import { GROUP_PROMPTS, REFLECTIONS } from "@/lib/reflections";
import { SYMBOL_KINDS, SYMBOL_LABELS, type Piece, type SymbolKind } from "@/lib/symbols";

import { PictureView } from "./PictureView";
import { SymbolGlyph } from "./ShapeGraphic";

export function ResultsView({
  pieces,
  duplicateKind,
  onEdit,
  onStartOver,
}: {
  pieces: Piece[];
  duplicateKind: SymbolKind;
  onEdit: () => void;
  onStartOver: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [saveState, setSaveState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working" | "done" | "error">("idle");
  const others = SYMBOL_KINDS.filter((k) => k !== duplicateKind);
  const featured = REFLECTIONS[duplicateKind];

  const handleSave = async () => {
    if (!svgRef.current) return;
    setSaveState("working");
    try {
      const blob = await renderSvgToPng(svgRef.current);
      const result = await saveImage(blob, "my-symbol-picture.png");
      setSaveState(result === "cancelled" ? "idle" : "done");
    } catch {
      setSaveState("error");
    }
  };

  const handlePdf = async () => {
    if (!svgRef.current) return;
    setPdfState("working");
    try {
      const { jsPDF } = await import("jspdf");
      const picture = await renderSvgToPng(svgRef.current);
      const pdf = new jsPDF({ unit: "mm", format: "letter" });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      const margin = 18;
      let y = 20;
      const clean = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[—–]/g, "-");
      const heading = (s: string, size = 18) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(size);
        pdf.setTextColor(25, 65, 85);
        pdf.text(clean(s), margin, y);
        y += size * 0.45 + 3;
      };
      const paragraph = (s: string, size = 12) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(35, 40, 45);
        const lines = pdf.splitTextToSize(clean(s), width - margin * 2) as string[];
        for (const line of lines) {
          if (y > height - 22) { pdf.addPage(); y = 20; }
          pdf.text(line, margin, y);
          y += size * 0.45;
        }
        y += 3;
      };
      const nextPage = () => { pdf.addPage(); y = 20; };
      heading("Leadwithshape", 26);
      paragraph("My symbol picture | Biblical leadership reflection");
      pdf.addImage(new Uint8Array(await picture.arrayBuffer()), "PNG", (width - 85) / 2, y, 85, 85);
      y += 94;
      heading("You doubled the " + SYMBOL_LABELS[duplicateKind].toLowerCase(), 16);
      heading(featured.role, 21);
      paragraph(featured.tagline);
      paragraph(featured.description);
      paragraph("Possible strengths: " + featured.strengths.join(" | "));
      paragraph("Watch for: " + featured.watchFor);
      paragraph('"' + featured.verse.text + '" - ' + featured.verse.reference + " (CSB, excerpt)");
      paragraph("Reflect: " + featured.question);
      nextPage();
      heading("The rest of your picture", 22);
      for (const kind of others) {
        const r = REFLECTIONS[kind];
        if (y > height - 82) nextPage();
        heading(SYMBOL_LABELS[kind] + " | " + r.role, 16);
        paragraph(r.description);
        paragraph("Possible strengths: " + r.strengths.join(" | "));
        paragraph("Watch for: " + r.watchFor);
        paragraph('"' + r.verse.text + '" - ' + r.verse.reference + " (CSB, excerpt)");
        paragraph("Reflect: " + r.question);
        y += 3;
      }
      nextPage();
      heading("Talk it over together", 22);
      GROUP_PROMPTS.forEach((q, i) => { paragraph((i + 1) + ". " + q, 13); y += 7; });
      paragraph('"For just as the body is one and has many parts... so also is Christ." - 1 Corinthians 12:12 (CSB, excerpt)');
      y += 8;
      heading("About this activity", 15);
      paragraph("A lighthearted conversation starter, not a validated psychological or personality assessment. Your shapes do not define you.");
      paragraph("Visit pastorg.ca/shape for the activity and background sources.");
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text("Leadwithshape | pastorg.ca/shape", margin, height - 10);
        pdf.text(String(i) + " / " + pdf.getNumberOfPages(), width - margin, height - 10, { align: "right" });
      }
      const blob = pdf.output("blob");
      const file = new File([blob], "my-leadwithshape-reflection.pdf", { type: "application/pdf" });
      let shared = false;
      if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "My Leadwithshape reflection" }); shared = true; }
        catch (err) { if (err instanceof Error && err.name === "AbortError") { setPdfState("idle"); return; } }
      }
      if (!shared) pdf.save(file.name);
      setPdfState("done");
    } catch {
      setPdfState("error");
    }
  };

  return (
    <div className="animate-rise space-y-6">
      <Button type="button" variant="ghost" size="lg" className="-ml-2" onClick={onEdit}>
        <ArrowLeft /> Keep editing
      </Button>

      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-cta">Your reflection</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">What might your picture say?</h1>
      </header>

      <aside
        className="flex gap-3 rounded-2xl border border-notice-foreground/20 bg-notice p-4 text-notice-foreground"
        aria-label="About this activity"
      >
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-lg leading-relaxed">
          <strong>Just for fun — and for conversation.</strong> This is a lighthearted conversation starter, not a
          validated psychological or personality assessment. Your shapes don&apos;t define you; they simply give your
          group a playful way to talk about how God has wired each of us differently.
        </p>
      </aside>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <section aria-labelledby="picture-heading" className="space-y-3">
          <h2 id="picture-heading" className="sr-only">
            Your picture
          </h2>
          <div className="overflow-hidden rounded-3xl border bg-canvas shadow-canvas">
            <PictureView ref={svgRef} pieces={pieces} className="block aspect-square h-auto w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="lg" onClick={handleSave} disabled={saveState === "working"}>
              <Download /> {saveState === "working" ? "Preparing…" : "Save picture"}
            </Button>
            <Button type="button" variant="default" size="lg" onClick={handlePdf} disabled={pdfState === "working"}>
              <FileDown /> {pdfState === "working" ? "Preparing PDF…" : "Download PDF Report"}
            </Button>
            <p className="w-full text-base text-muted-foreground" aria-live="polite">
              {pdfState === "done" && "Your PDF is ready."}
              {pdfState === "error" && "Could not create the PDF. Please try again."}
            </p>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {saveState === "done" && "Saved! Share it with your group."}
              {saveState === "error" && "Sorry, saving didn't work on this device — try a screenshot instead."}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="featured-heading"
          className="rounded-3xl border-2 border-primary bg-card p-5 shadow-lift sm:p-6"
        >
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" /> You doubled the {SYMBOL_LABELS[duplicateKind].toLowerCase()}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <SymbolGlyph kind={duplicateKind} className="size-14" />
              <SymbolGlyph kind={duplicateKind} className="size-14" />
            </div>
            <div>
              <h2 id="featured-heading" className="text-3xl font-semibold">
                {featured.role}
              </h2>
              <p className="text-muted-foreground">{featured.tagline}</p>
            </div>
          </div>
          <p className="mt-4 leading-relaxed">{featured.description}</p>
          <ReflectionDetails kind={duplicateKind} />
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Doubling a symbol is a playful hint at a strength you may lean on — but you used all four, and so does every
            good team.
          </p>
        </section>
      </div>

      <section aria-labelledby="others-heading" className="space-y-3">
        <h2 id="others-heading" className="text-2xl font-semibold">
          The rest of your picture
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {others.map((kind) => {
            const r = REFLECTIONS[kind];
            return (
              <article key={kind} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <SymbolGlyph kind={kind} className="size-11" />
                  <div>
                    <h3 className="text-xl font-semibold">{r.role}</h3>
                    <p className="text-sm text-muted-foreground">
                      {SYMBOL_LABELS[kind]} · {r.tagline}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-lg leading-relaxed">{r.description}</p>
                <ReflectionDetails kind={kind} compact />
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="talk-heading" className="rounded-3xl bg-primary p-5 text-primary-foreground sm:p-7">
        <h2 id="talk-heading" className="text-2xl font-semibold">
          Talk it over together
        </h2>
        <ol className="mt-4 space-y-3 text-lg leading-relaxed">
          {GROUP_PROMPTS.map((q, i) => (
            <li key={q} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{q}</span>
            </li>
          ))}
        </ol>
        <blockquote className="mt-6 border-l-2 border-primary-foreground/40 pl-4 font-display text-lg italic">
          “For just as the body is one and has many parts… so also is Christ.”
          <cite className="mt-1 block font-sans text-sm not-italic opacity-80">1 Corinthians 12:12 (CSB, excerpt)</cite>
        </blockquote>
      </section>

      <details className="rounded-xl border border-border/60 bg-card px-4 py-3 text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">About this exercise &amp; sources</summary>
        <div className="mt-3 space-y-3 text-lg leading-relaxed">
          <p>
            Leadwithshape is an adapted, lighthearted shape-picture discussion activity. Its biblical leadership
            reflections, Scripture connections, and group questions were developed for this version, inspired in part
            by a biblical leadership course. It is not a validated personality assessment.
          </p>
          <p>
            The four-shape drawing prompt (triangle, square, circle, and squiggle, with one repeated) also appears in
            <a className="ml-1 underline underline-offset-2 hover:text-foreground" href="https://discover.hubpages.com/education/Simple-Symbol-Personality-Test" target="_blank" rel="noopener noreferrer">
              “Simple Symbol Personality Test” by drbj and sherry
            </a>. Earlier shape-based communication work includes Susan Dellinger&apos;s
            <a className="ml-1 underline underline-offset-2 hover:text-foreground" href="https://psychogeometrics.com/about/the-science/" target="_blank" rel="noopener noreferrer">
              PsychoGeometrics
            </a>, which uses five shapes. These references provide background, not a verified claim about who first created this particular drawing exercise.
          </p>
          <p>Leadwithshape is an independent adaptation and is not affiliated with or endorsed by these sources.</p>
        </div>
      </details>

      <div className="flex flex-col gap-3 pb-4 sm:flex-row">
        <Button type="button" size="lg" onClick={handlePdf} disabled={pdfState === "working"}><FileDown /> {pdfState === "working" ? "Preparing PDF…" : "Download PDF Report"}</Button>
        <Button type="button" variant="outline" size="lg" onClick={onEdit}>
          <ArrowLeft /> Keep editing my picture
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onStartOver}>
          <RefreshCcw /> Start a new picture
        </Button>
      </div>
    </div>
  );
}

function ReflectionDetails({ kind, compact = false }: { kind: SymbolKind; compact?: boolean }) {
  const r = REFLECTIONS[kind];
  return (
    <div className={compact ? "mt-3 space-y-3 text-lg leading-relaxed" : "mt-4 space-y-3 text-lg leading-relaxed"}>
      <ul className="flex flex-wrap gap-1.5" aria-label="Possible strengths">
        {r.strengths.map((s) => (
          <li key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            {s}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        <strong className="text-foreground">Watch for:</strong> {r.watchFor}
      </p>
      <p className={compact ? "font-display italic" : "font-display text-lg italic"}>
        “{r.verse.text}” <span className="font-sans text-sm not-italic text-muted-foreground">— {r.verse.reference} (CSB, excerpt)</span>
      </p>
      <p className="text-lg leading-relaxed">
        <strong>Reflect:</strong> {r.question}
      </p>
    </div>
  );
}