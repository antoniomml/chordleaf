import { layout, PAGE } from "./layout.js";
import { chordRE } from "./music.js";
import { parsePdfPages, chordRow } from "./pdf-import.js";
import { registerPdfFonts, DOCUMENT_FONT, fontBinaries } from "./fonts.js";
export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
export function txt(song) {
  return `{title: ${song.title}}\n{artist: ${song.artist}}\n{capo: ${song.capo}}\n{columns: ${song.columns}}\n{fontSize: ${song.fontSize}}\n{margin: ${song.margin}}\n{chordAlign: ${song.chordAlign || "start"}}\n\n${song.text}`;
}
export async function exportSong(song, type) {
  const name = (song.title || "Canción").replace(/[\\/:*?"<>|]/g, "-");
  if (type === "txt") {
    download(
      new Blob([txt(song)], { type: "text/plain;charset=utf-8" }),
      name + ".txt",
    );
    return;
  }
  const l = layout(song);
  if (type === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    await registerPdfFonts(pdf);
    pdf.setProperties({
      title: song.title,
      author: song.artist,
      creator: "Chordi",
    });
    l.pages.forEach((page, i) => {
      if (i) pdf.addPage();
      if (!i) {
        pdf.setTextColor("#111111");
        pdf.setFont("GoogleSansCode", "bold");
        pdf.setFontSize(l.header.titleSize);
        l.titleLines.forEach((line, index) =>
          pdf.text(line, l.margin, l.margin + 16 + index * 20),
        );
        pdf.setFont("GoogleSansCode", "normal");
        pdf.setFontSize(l.header.artistSize);
        l.header.artistLines.forEach((line, index) =>
          pdf.text(
            line,
            l.margin + l.header.artistX,
            l.margin + l.header.artistY + index * 16,
          ),
        );
        pdf.setFontSize(11);
        pdf.text(`CAPO ${song.capo}`, l.margin, l.margin + l.header.capoY);
      }
      for (const column of page.columns)
        for (const row of column) {
          pdf.setFont("GoogleSansCode", "bold");
          pdf.setFontSize(l.size);
          pdf.setTextColor("#111111");
          for (const m of row.marks)
            pdf.text(
              m.chord,
              row.x + m.x * l.cw,
              row.y + l.size + (m.lane || 0) * l.size * 1.44,
            );
          pdf.setFont("GoogleSansCode", "normal");
          pdf.setTextColor("#111111");
          pdf.text(row.lyric, row.x, row.y + l.size + row.lyricOffset);
        }
    });
    pdf.save(name + ".pdf");
    return;
  }
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    TabStopType,
    Tab,
    PageBreak,
  } = await import("docx");
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    borders = {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
    };
  const para = (
    text,
    size,
    bold = false,
    color = "111111",
    height = size * 1.65,
  ) =>
    new Paragraph({
      spacing: {
        before: 0,
        after: 0,
        line: Math.round(height * 20),
        lineRule: "exact",
      },
      children: [
        new TextRun({ text, font: DOCUMENT_FONT, size: size * 2, bold, color }),
      ],
    });
  const children = [];
  l.pages.forEach((page, i) => {
    if (i)
      children.push(
        new Paragraph({
          children: [new PageBreak()],
          spacing: { before: 0, after: 0, line: 1, lineRule: "exact" },
        }),
      );
    if (!i) {
      l.titleLines.forEach((line, index) =>
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 0, line: 400, lineRule: "exact" },
            tabStops: [
              {
                type: TabStopType.LEFT,
                position: Math.round(l.header.artistX * 20),
              },
            ],
            children: [
              new TextRun({
                text: line,
                font: DOCUMENT_FONT,
                bold: true,
                size: 32,
                color: "111111",
              }),
              ...(index === 0 && l.header.artistInline
                ? [
                    new TextRun({
                      text: "\t" + song.artist,
                      font: DOCUMENT_FONT,
                      size: 24,
                      color: "111111",
                    }),
                  ]
                : []),
            ],
          }),
        ),
      );
      if (!l.header.artistInline)
        for (const line of l.header.artistLines)
          children.push(
            new Paragraph({
              spacing: { before: 0, after: 0, line: 320, lineRule: "exact" },
              children: [
                new TextRun({
                  text: line,
                  font: DOCUMENT_FONT,
                  size: 24,
                  color: "111111",
                }),
              ],
            }),
          );
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0, line: 320, lineRule: "exact" },
          children: [
            new TextRun({
              text: `CAPO ${song.capo}`,
              font: DOCUMENT_FONT,
              size: 22,
              color: "111111",
            }),
          ],
        }),
      );
      children.push(para(" ", 1, false, "FFFFFF", 16));
    }
    const cells = [];
    page.columns.forEach((rows, c) => {
      if (c)
        cells.push(
          new TableCell({
            width: { size: l.gap * 20, type: WidthType.DXA },
            borders,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [para("", 1, false, "FFFFFF", 1)],
          }),
        );
      const paras = [];
      for (const row of rows) {
        if (row.instrumental) {
          let line = row.lyric;
          for (const m of [...row.marks].reverse())
            line =
              line.slice(0, m.at) + m.chord + line.slice(m.at + m.chord.length);
          paras.push(para(line, l.size, true, "111111", row.height));
        } else if (row.marks.length) {
          for (
            let lane = 0;
            lane < Math.round(row.lyricOffset / (l.size * 1.44));
            lane++
          ) {
            const marks = row.marks.filter((m) => (m.lane || 0) === lane);
            if (song.chordAlign !== "center") {
              let line = "";
              for (const m of marks) line = line.padEnd(m.at, " ") + m.chord;
              paras.push(para(line, l.size, true, "111111", l.size * 1.44));
              continue;
            }
            paras.push(
              new Paragraph({
                spacing: {
                  before: 0,
                  after: 0,
                  line: Math.round(l.size * 1.44 * 20),
                  lineRule: "exact",
                },
                tabStops: marks
                  .filter((m) => m.x > 0)
                  .map((m) => ({
                    type: TabStopType.LEFT,
                    position: Math.round(m.x * l.cw * 20),
                  })),
                children: marks.map(
                  (m) =>
                    new TextRun({
                      children: [...(m.x > 0 ? [new Tab()] : []), m.chord],
                      font: DOCUMENT_FONT,
                      size: l.size * 2,
                      bold: true,
                    }),
                ),
              }),
            );
          }
          paras.push(
            para(
              row.lyric || " ",
              l.size,
              false,
              "111111",
              row.height - row.lyricOffset,
            ),
          );
        } else
          paras.push(
            para(row.lyric || " ", l.size, false, "111111", row.height),
          );
      }
      cells.push(
        new TableCell({
          width: { size: Math.round(l.width * 20), type: WidthType.DXA },
          borders,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: paras.length ? paras : [para("", 1)],
        }),
      );
    });
    children.push(
      new Table({
        width: {
          size: Math.round((PAGE.width - l.margin * 2) * 20),
          type: WidthType.DXA,
        },
        columnWidths:
          song.columns === 2
            ? [Math.round(l.width * 20), l.gap * 20, Math.round(l.width * 20)]
            : [Math.round(l.width * 20)],
        rows: [new TableRow({ cantSplit: true, children: cells })],
        borders: {
          ...borders,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
      }),
    );
  });
  const [regularFont, boldFont] = await fontBinaries();
  const doc = new Document({
    fonts: [
      { name: DOCUMENT_FONT, data: regularFont },
      { name: `${DOCUMENT_FONT} Bold`, data: boldFont },
    ],
    sections: [
      {
        properties: {
          page: {
            size: {
              width: Math.round(PAGE.width * 20),
              height: Math.round(PAGE.height * 20),
            },
            margin: {
              top: Math.round(l.margin * 20),
              bottom: Math.round(l.margin * 20),
              left: Math.round(l.margin * 20),
              right: Math.round(l.margin * 20),
            },
          },
        },
        children,
      },
    ],
  });
  // docx's high-level font API only emits embedRegular. Associate the second
  // binary with embedBold on the same family, and declare fixed pitch so that
  // readers that ignore embedded fonts still select a monospace substitute.
  const [regular, bold] = doc.FontTable.fontOptionsWithKey;
  const overrides = [
    {
      path: "word/fontTable.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:font w:name="Google Sans Code"><w:altName w:val="Courier New"/><w:family w:val="modern"/><w:pitch w:val="fixed"/><w:embedRegular r:id="rId1" w:fontKey="{${regular.fontKey}}"/><w:embedBold r:id="rId2" w:fontKey="{${bold.fontKey}}"/></w:font></w:fonts>`,
    },
    {
      path: "word/settings.xml",
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:embedTrueTypeFonts/><w:embedSystemFonts/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>',
    },
  ];
  download(await Packer.toBlob(doc, false, overrides), name + ".docx");
}
function alignText(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(/\S+/g)];
    if (chordRow([{ text: line }])) {
      const next = lines[i + 1] || "";
      if (
        next.trim() &&
        !next.trim().startsWith("{") &&
        !/[|–—−-]/.test(line) &&
        !chordRow([{ text: next }])
      ) {
        let lyric = next;
        for (const m of matches.reverse())
          lyric =
            lyric.padEnd(m.index, " ").slice(0, m.index) +
            `[${m[0]}]` +
            lyric.slice(m.index);
        out.push(lyric);
        i++;
      } else
        out.push(line.replace(/\S+/g, (c) => (chordRE.test(c) ? `[${c}]` : c)));
    } else out.push(line);
  }
  return out.join("\n");
}
export function importText(text, fallback) {
  let song = { title: fallback, artist: "", capo: 0 },
    lines = text.replace(/\r/g, "").split("\n");
  lines = lines.filter((line) => {
    const m = line.match(
      /^\{(title|artist|capo|columns|fontSize|margin|chordAlign):\s*(.*?)\}$/i,
    );
    if (!m) return true;
    const key = m[1];
    song[key] = ["title", "artist", "chordAlign"].includes(key)
      ? m[2]
      : Number(m[2]);
    return false;
  });
  const capo = lines.findIndex((l) =>
    /^(?:cejilla|capo)\s*[:=]?\s*\d+/i.test(l),
  );
  if (capo >= 0) {
    song.capo = Number(lines[capo].match(/\d+/)[0]);
    lines.splice(capo, 1);
  }
  song.text = alignText(lines).replace(/^\n+|\n+$/g, "");
  return song;
}
export async function importFile(file) {
  const ext = file.name.split(".").pop().toLowerCase(),
    fallback = file.name.replace(/\.[^.]+$/, "");
  if (ext === "txt" || ext === "cho" || ext === "chordpro")
    return importText(await file.text(), fallback);
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml(
      {
        arrayBuffer: await file.arrayBuffer(),
      },
      { ignoreEmptyParagraphs: false },
    );
    const html = new DOMParser().parseFromString(result.value, "text/html");
    const lines = [];
    let columns = 1;
    function readParagraphs(root) {
      for (const p of root.querySelectorAll("p,h1,h2,h3"))
        lines.push(p.textContent.trim() ? p.textContent : "");
    }
    for (const block of html.body.children) {
      if (block.tagName === "TABLE") {
        const cells = [...block.querySelectorAll("tr:first-child > td")].filter(
          (c) => c.textContent.trim(),
        );
        if (cells.length > 1) columns = 2;
        cells.forEach((cell, index) => {
          if (index) lines.push("{column}");
          readParagraphs(cell);
        });
      } else lines.push(block.textContent.trim() ? block.textContent : "");
    }
    let title = fallback,
      artist = "";
    const firstMusic = lines.findIndex(
      (line) => line.includes("[") || chordRow([{ text: line }]),
    );
    if (firstMusic > 0) {
      const header = lines.splice(0, firstMusic);
      const capoLine = header.find((line) =>
        /(?:cejilla|capo)\s*\d+/i.test(line),
      );
      const names = header
        .map((line) => line.replace(/(?:cejilla|capo)\s*\d+/gi, "").trim())
        .filter(Boolean);
      title = names[0] || fallback;
      artist = names.slice(1).join(" ");
      const firstParagraph = html.body.querySelector("p,h1,h2");
      const boldTitle = firstParagraph?.querySelector("strong")?.textContent;
      if (boldTitle && firstParagraph.textContent.includes("\t")) {
        title = boldTitle;
        artist = firstParagraph.textContent.slice(boldTitle.length).trim();
      }
      if (capoLine) lines.unshift(capoLine.match(/(?:cejilla|capo)\s*\d+/i)[0]);
    }
    const imported = importText(lines.join("\n"), fallback);
    return {
      ...imported,
      title,
      artist,
      columns,
      notice:
        "Word importado. Revisa el título y la alineación de los acordes.",
    };
  }
  if (ext !== "pdf")
    throw Error(
      "Selecciona un archivo TXT, PDF o DOCX. Para un .doc antiguo, guárdalo primero como DOCX.",
    );
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  const pages = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n),
        viewport = page.getViewport({ scale: 1 }),
        content = await page.getTextContent();
      const measure = document.createElement("canvas").getContext("2d");
      pages.push({
        width: viewport.width,
        height: viewport.height,
        items: content.items
          .filter((i) => i.str?.trim())
          .map((i) => {
            const size = Math.hypot(i.transform[2], i.transform[3]) || 12;
            const family =
              content.styles[i.fontName]?.fontFamily || "monospace";
            measure.font = `${size}px ${family}`;
            const full = measure.measureText(i.str).width || 1;
            const monospace =
              /mono/i.test(family) ||
              Math.abs(i.width / Math.max(1, i.str.length) / size - 0.6) <
                0.012;
            const advances = Array.from({ length: i.str.length }, (_, j) =>
              monospace
                ? j / i.str.length
                : measure.measureText(i.str.slice(0, j)).width / full,
            );
            return {
              text: i.str,
              x: i.transform[4],
              y: viewport.height - i.transform[5],
              width: i.width,
              size,
              advances,
            };
          }),
      });
    }
    return parsePdfPages(pages, fallback);
  } finally {
    await loadingTask.destroy();
  }
}
