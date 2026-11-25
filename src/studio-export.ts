import {
  colours,
  guidelines,
  themeById,
  type StudioKit,
} from "./studio-themes";

export async function exportBrandPdf(
  kit: StudioKit,
  post: HTMLElement,
  story: HTMLElement,
) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  await document.fonts.ready;
  const postImage = await html2canvas(post, { scale: 2, logging: false });
  const storyImage = await html2canvas(story, { scale: 2, logging: false });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const theme = themeById(kit.theme)?.name ?? "Custom identity";
  const name = kit.name.trim() || "Your brand";
  pdf.setProperties({ title: name + " | Brand identity", author: "Creovate" });
  function page(title: string) {
    pdf.setFillColor("#F8F2E7").rect(0, 0, 210, 297, "F");
    pdf.setTextColor("#35264A").setFont("helvetica", "bold").setFontSize(10);
    pdf.text("CREOVATE / CREATIVE STUDIO", 16, 18);
    pdf.setFont("times", "bold").setFontSize(28).text(title, 16, 35);
    pdf.setFont("helvetica", "normal");
  }

  page("Brand identity");
  pdf.setFont("times", "bold").setFontSize(23);
  const nameLines = pdf.splitTextToSize(name, 178);
  pdf.text(nameLines, 16, 52);
  let y = 55 + 10 * nameLines.length;
  pdf.setFont("helvetica", "normal").setFontSize(12);
  const brandLines = pdf.splitTextToSize(
    [kit.tagline.trim(), theme + " / " + kit.industry + " / " + kit.personality]
      .filter(Boolean)
      .join("\n"),
    178,
  );
  pdf.text(brandLines, 16, y);
  y += brandLines.length * 6 + 12;
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(14)
    .text("Colour palette", 16, y);
  y += 6;
  colours.forEach(([field, label], index) => {
    const x = 16 + index * 36;
    pdf.setFillColor(kit[field]).roundedRect(x, y, 32, 18, 1, 1, "F");
    pdf
      .setFont("helvetica", "bold")
      .setFontSize(10)
      .text(label, x, y + 24);
    pdf.setFont("courier", "normal").text(kit[field].toUpperCase(), x, y + 29);
  });
  y += 44;
  pdf.setFont("helvetica", "bold").setFontSize(14).text("Typography", 16, y);
  pdf
    .setFont("helvetica", "normal")
    .setFontSize(11)
    .text(
      ["Heading / " + kit.headingFont, "Body / " + kit.bodyFont],
      16,
      y + 8,
    );
  y += 27;
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(14)
    .text("Identity guidelines", 16, y);
  pdf.setFont("helvetica", "normal").setFontSize(10);
  y += 8;
  for (const [index, rule] of guidelines(kit).entries()) {
    const lines = pdf.splitTextToSize(rule, 168);
    pdf.text(String(index + 1) + ".", 16, y);
    pdf.text(lines, 24, y);
    y += lines.length * 4.5 + 4;
  }

  pdf.addPage();
  page("Social design");
  pdf
    .setFontSize(11)
    .text("Instagram post", 16, 49)
    .text("Instagram story", 127, 49);
  pdf.addImage(postImage, "PNG", 16, 55, 101, 101);
  pdf.addImage(storyImage, "PNG", 127, 55, 66, 117.33);
  const filename = name
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  pdf.save((filename || "creovate") + "-brand-kit.pdf");
}
