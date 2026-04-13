import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { API_BASE } from './api';

const CONTENT_FONT = "Comic Sans MS";
const TEAL = [48, 144, 160]; // #3090A0
const DARK = [31, 41, 55];
const MUTED = [107, 114, 128];

const ACTIVITY_TYPE_LABELS = { quiz: "Quiz", image: "Flashcards", story: "Text Story" };

// ─── Watermark helpers ───────────────────────────────────────────────

async function loadLogoDataUrl() {
  try {
    const res = await fetch("/logo/logo.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addWatermark(doc, logoData) {
  if (!logoData) return;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const imgW = 90;
  const imgH = 90;
  const x = (pw - imgW) / 2;
  const y = (ph - imgH) / 2;
  doc.setGState(doc.GState({ opacity: 0.06 }));
  doc.addImage(logoData, "PNG", x, y, imgW, imgH);
  doc.setGState(doc.GState({ opacity: 1 }));
}

// ─── Lesson Plan PDF ────────────────────────────────────────────────

export async function downloadLessonPlanPDF(plan) {
  const logoData = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  addWatermark(doc, logoData);

  const checkPage = (needed = 12) => {
    if (y + needed > 280) {
      doc.addPage();
      addWatermark(doc, logoData);
      y = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...TEAL);
  const titleLines = doc.splitTextToSize(plan.title || "Lesson Plan", contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const meta = [
    `Age Group: ${plan.age_group} years`,
    `Duration: ${plan.duration_minutes} minutes`,
    `Learning Area: ${plan.learning_area}`,
    `Language: ${plan.language === "en" ? "English" : "Bahasa Malaysia"}`,
  ];
  if (plan.plan_type === "unit") {
    meta.push(`Plan Type: Unit Plan (${plan.duration_weeks || "-"} weeks)`);
    if (plan.unit_theme) meta.push(`Unit Theme: ${plan.unit_theme}`);
  }
  meta.forEach((txt) => {
    doc.text(txt, margin, y);
    y += 5;
  });
  y += 4;

  const sectionHeader = (title) => {
    checkPage(16);
    doc.setFontSize(13);
    doc.setTextColor(...TEAL);
    doc.text(title, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
  };

  // DSKP Standards
  if (plan.dskp_standards?.length) {
    sectionHeader("DSKP Standards");
    plan.dskp_standards.forEach((std) => {
      checkPage();
      const code = typeof std === "object" ? std.code : std;
      const title = typeof std === "object" ? std.title : "";
      const line = title ? `${code} — ${title}` : code;
      const lines = doc.splitTextToSize(`• ${line}`, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Objectives
  if (plan.objectives?.length) {
    sectionHeader("Learning Objectives");
    plan.objectives.forEach((obj, i) => {
      checkPage();
      const lines = doc.splitTextToSize(`${i + 1}. ${obj}`, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Materials
  if (plan.materials?.length) {
    sectionHeader("Digital Resources");
    plan.materials.forEach((mat) => {
      checkPage();
      const lines = doc.splitTextToSize(`• ${mat}`, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Weekly breakdown (UNP) OR flat activities (LP)
  if (plan.plan_type === "unit" && plan.weeks?.length) {
    sectionHeader("Activities by Week");
    if (plan.unit_theme) {
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(`Unit Theme: ${plan.unit_theme}`, margin + 2, y);
      y += 6;
    }
    plan.weeks.forEach((week) => {
      checkPage(22);
      doc.setFontSize(12);
      doc.setTextColor(...TEAL);
      doc.text(
        `Week ${week.week_number || ""}: ${week.theme || ""}`,
        margin + 2,
        y,
      );
      y += 7;
      doc.setFontSize(10);
      (week.activities || []).forEach((act) => {
        checkPage(16);
        doc.setTextColor(...DARK);
        const typeLabel = ACTIVITY_TYPE_LABELS[act.type] || act.type || "";
        const header = `${act.title}${act.duration ? ` (${act.duration})` : ""}${typeLabel ? ` — ${typeLabel}` : ""}`;
        const headerLines = doc.splitTextToSize(`  • ${header}`, contentWidth - 6);
        doc.text(headerLines, margin + 4, y);
        y += headerLines.length * 5;
        if (act.description) {
          doc.setTextColor(...MUTED);
          const descLines = doc.splitTextToSize(act.description, contentWidth - 12);
          doc.text(descLines, margin + 8, y);
          y += descLines.length * 4.5;
        }
        y += 2;
        doc.setTextColor(...DARK);
      });
      y += 4;
    });
    y += 2;
  } else if (plan.activities?.length) {
    sectionHeader("Activities");
    plan.activities.forEach((act) => {
      checkPage(18);
      const typeLabel = ACTIVITY_TYPE_LABELS[act.type] || act.type || "";
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(
        `${act.title}${act.duration ? ` (${act.duration})` : ""}${typeLabel ? ` — ${typeLabel}` : ""}`,
        margin + 2,
        y,
      );
      y += 5;
      if (act.description) {
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        const descLines = doc.splitTextToSize(act.description, contentWidth - 8);
        doc.text(descLines, margin + 4, y);
        y += descLines.length * 4.5 + 2;
        doc.setTextColor(...DARK);
      }
    });
    y += 4;
  }

  // Assessment
  if (plan.assessment) {
    sectionHeader("Assessment Strategy");
    const lines = doc.splitTextToSize(plan.assessment, contentWidth - 4);
    lines.forEach((line) => {
      checkPage();
      doc.text(line, margin + 2, y);
      y += 4.5;
    });
    y += 4;
  }

  // Adaptations
  if (plan.adaptations?.length) {
    sectionHeader("Adaptations");
    plan.adaptations.forEach((adp) => {
      checkPage();
      const lines = doc.splitTextToSize(`• ${adp}`, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Teacher Notes
  if (plan.teacher_notes) {
    sectionHeader("Teacher Notes");
    const lines = doc.splitTextToSize(plan.teacher_notes, contentWidth - 4);
    lines.forEach((line) => {
      checkPage();
      doc.text(line, margin + 2, y);
      y += 4.5;
    });
  }

  const safeName = (plan.title || "lesson-plan").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
  doc.save(`${safeName}.pdf`);
}

// ─── Activity Content PDF ───────────────────────────────────────────

export async function downloadActivityPDF(activity) {
  const logoData = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  addWatermark(doc, logoData);

  const checkPage = (needed = 12) => {
    if (y + needed > 280) {
      doc.addPage();
      addWatermark(doc, logoData);
      y = margin;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  const titleLines = doc.splitTextToSize(activity.title || "Activity", contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Type: ${activity.activity_type || activity.type || ""}`, margin, y);
  y += 8;

  const content = activity.generated_content;
  if (!content) {
    doc.setTextColor(...DARK);
    doc.text("No generated content available.", margin, y);
    doc.save("activity.pdf");
    return;
  }

  doc.setTextColor(...DARK);

  if (activity.activity_type === "quiz" && content.questions) {
    content.questions.forEach((q, i) => {
      checkPage(30);
      doc.setFontSize(12);
      doc.setTextColor(...DARK);
      const qLines = doc.splitTextToSize(`Q${i + 1}: ${q.question}`, contentWidth - 4);
      doc.text(qLines, margin + 2, y);
      y += qLines.length * 5.5;
      doc.setFontSize(10);
      (q.options || []).forEach((opt, oi) => {
        checkPage();
        const prefix = oi === q.correct_answer ? "✓" : " ";
        const oLines = doc.splitTextToSize(`  ${prefix} ${String.fromCharCode(65 + oi)}. ${opt}`, contentWidth - 8);
        if (oi === q.correct_answer) doc.setTextColor(16, 185, 129);
        else doc.setTextColor(...DARK);
        doc.text(oLines, margin + 4, y);
        y += oLines.length * 4.5;
      });
      doc.setTextColor(...DARK);
      if (q.explanation) {
        checkPage();
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        const eLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 8);
        doc.text(eLines, margin + 4, y);
        y += eLines.length * 4 + 2;
        doc.setTextColor(...DARK);
        doc.setFontSize(10);
      }
      y += 4;
    });
  }

  if (activity.activity_type === "image" && content.images) {
    content.images.forEach((card, i) => {
      checkPage(20);
      doc.setFontSize(13);
      doc.setTextColor(...DARK);
      doc.text(`${i + 1}. ${card.label}`, margin + 2, y);
      y += 6;
      if (card.learning_point) {
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        const lpLines = doc.splitTextToSize(card.learning_point, contentWidth - 8);
        doc.text(lpLines, margin + 4, y);
        y += lpLines.length * 4.5;
      }
      y += 4;
    });
  }

  if (activity.activity_type === "story" && content.pages) {
    if (content.story_title) {
      doc.setFontSize(14);
      doc.setTextColor(...TEAL);
      doc.text(content.story_title, margin, y);
      y += 8;
    }
    content.pages.forEach((page) => {
      checkPage(20);
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      const pLines = doc.splitTextToSize(page.text || "", contentWidth - 4);
      doc.text(pLines, margin + 2, y);
      y += pLines.length * 5 + 6;
    });
    if (content.vocabulary?.length) {
      checkPage(16);
      doc.setFontSize(12);
      doc.setTextColor(...TEAL);
      doc.text("Vocabulary", margin, y);
      y += 6;
      doc.setFontSize(10);
      content.vocabulary.forEach((v) => {
        checkPage();
        doc.setTextColor(...DARK);
        const vLines = doc.splitTextToSize(`${v.word}: ${v.definition}`, contentWidth - 4);
        doc.text(vLines, margin + 2, y);
        y += vLines.length * 4.5;
      });
    }
    if (content.moral) {
      checkPage(12);
      doc.setFontSize(11);
      doc.setTextColor(...TEAL);
      doc.text("Moral: ", margin, y);
      doc.setTextColor(...DARK);
      const mLines = doc.splitTextToSize(content.moral, contentWidth - 20);
      doc.text(mLines, margin + 15, y);
      y += mLines.length * 5;
    }
  }

  const safeName = (activity.title || "activity").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
  doc.save(`${safeName}.pdf`);
}

// ─── Flashcard ZIP Download ─────────────────────────────────────────

/**
 * Download a flashcard ZIP for the given activity.
 * Image fetch happens server-side via the Firebase Admin SDK,
 * so there are no browser CORS or Storage-rules issues.
 * @param {object} activity - activity object with .id and .title
 * @param {string} idToken  - Firebase ID token of the current user
 */
export async function downloadFlashcardZIP(activity, idToken) {
  const res = await fetch(`${API_BASE}/activities/${activity.id}/download-flashcard-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to build flashcard ZIP");
  }

  const blob = await res.blob();
  const safeName = (activity.title || "flashcards").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 50);
  saveAs(blob, `${safeName}_flashcards.zip`);
}
