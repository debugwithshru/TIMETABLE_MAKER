"""
Cocoon Group Tuition — Weekly Schedule PDF
Grade 9 (A & B) | 5th – 9th May, 2026
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage
)
from reportlab.lib.colors import HexColor

# ── BRAND COLOURS ─────────────────────────────────────────────────────────────
ORANGE       = HexColor("#E87722")
NAVY         = HexColor("#1B2A4A")
ORANGE_PALE  = HexColor("#FFF3E8")
SUNSET_TINT  = HexColor("#FFE4D2")   # test row highlight
GREY_ROW     = HexColor("#F0F4F8")   # day/date col + alternate stripe
WHITE        = colors.white
BLACK        = HexColor("#1A1A1A")
GREY_TEXT    = HexColor("#555555")
BORDER_GREY  = HexColor("#DADDE3")

# ── PAGE SETUP ────────────────────────────────────────────────────────────────
W, H = A4
MARGIN_L = 18*mm
MARGIN_R = 18*mm
MARGIN_T = 14*mm
MARGIN_B = 16*mm

LOGO_PATH = "/home/claude/cocoon-logo-transparent.png"


# ── HEADER ────────────────────────────────────────────────────────────────────
def build_header(grade_label, week_label, date_str):
    usable_w = W - MARGIN_L - MARGIN_R
    logo_w = 18*mm
    logo_h = 20*mm
    logo_img = RLImage(LOGO_PATH, width=logo_w, height=logo_h)

    brand_name = Paragraph(
        '<font color="#E87722"><b>COCOON</b></font>'
        '<font color="#1B2A4A"> GROUP TUITION</font>',
        ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=13,
                       leading=16, textColor=NAVY)
    )
    tagline = Paragraph(
        "A Tutorial to Transform Your Child",
        ParagraphStyle("tagline", fontSize=7.5, textColor=GREY_TEXT,
                       fontName="Helvetica-Oblique", leading=10)
    )

    header_table = Table(
        [[logo_img, [brand_name, tagline]]],
        colWidths=[logo_w + 4*mm, usable_w - logo_w - 4*mm]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))

    divider = HRFlowable(width="100%", thickness=2, color=ORANGE,
                         spaceAfter=6, spaceBefore=4)

    title_style = ParagraphStyle(
        "doc_title", fontName="Helvetica-Bold", fontSize=17,
        textColor=NAVY, leading=21, alignment=TA_CENTER, spaceAfter=2
    )
    grade_style = ParagraphStyle(
        "grade", fontName="Helvetica-Bold", fontSize=12,
        textColor=ORANGE, leading=15, alignment=TA_CENTER
    )
    date_style = ParagraphStyle(
        "date_right", fontSize=9, textColor=GREY_TEXT, alignment=TA_RIGHT
    )

    title = Paragraph(f"WEEKLY SCHEDULE — {week_label}", title_style)
    grade = Paragraph(grade_label, grade_style)
    date  = Paragraph(f"Issued: {date_str}", date_style)

    return [
        header_table, Spacer(1, 3*mm), divider,
        Spacer(1, 1*mm), title, grade, Spacer(1, 1.5*mm),
        date, Spacer(1, 4*mm)
    ]


# ── SCHEDULE TABLE ────────────────────────────────────────────────────────────
def build_schedule_table(schedule, test_row_indices=None):
    """
    schedule: list of dicts with keys: day, date, time, subject, chapter, teacher
    test_row_indices: zero-based indices (within the schedule list) to highlight
    """
    test_row_indices = test_row_indices or []
    usable_w = W - MARGIN_L - MARGIN_R
    # Day | Date | Time | Subject | Chapter | Teacher
    # Day shrunk (now abbreviated), Chapter widened
    col_w = [16*mm, 18*mm, 30*mm, 26*mm, usable_w - 116*mm, 26*mm]

    # Day name → 3-letter abbreviation
    DAY_ABBREV = {
        "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed",
        "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat",
        "Sunday": "Sun",
    }

    def hdr(txt, align=TA_CENTER):
        return Paragraph(
            f"<b>{txt}</b>",
            ParagraphStyle("h", fontName="Helvetica-Bold",
                           fontSize=9.5, textColor=WHITE, alignment=align)
        )

    header_row = [hdr("Day"), hdr("Date"), hdr("Time"),
                  hdr("Subject", TA_LEFT), hdr("Chapter / Topic", TA_LEFT),
                  hdr("Teacher", TA_LEFT)]
    data = [header_row]

    cell = lambda txt, align=TA_LEFT, bold=False, color=BLACK: Paragraph(
        f"<b>{txt}</b>" if bold else txt,
        ParagraphStyle("c", fontName="Helvetica" if not bold else "Helvetica-Bold",
                       fontSize=9.5, textColor=color, alignment=align, leading=12)
    )

    # Group by day for spanning
    day_groups = {}
    ordered_days = []
    for i, s in enumerate(schedule):
        if s["day"] not in day_groups:
            day_groups[s["day"]] = []
            ordered_days.append(s["day"])
        day_groups[s["day"]].append((i, s))

    style_cmds = [
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("GRID",          (0,0), (-1,-1), 0.4, BORDER_GREY),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 7),
        ("RIGHTPADDING",  (0,0), (-1,-1), 7),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]

    row_idx = 1
    for day in ordered_days:
        sessions = day_groups[day]
        start_row = row_idx
        for i, (orig_idx, s) in enumerate(sessions):
            day_abbrev = DAY_ABBREV.get(s["day"], s["day"])
            day_cell  = cell(day_abbrev, align=TA_CENTER, bold=True, color=NAVY) if i == 0 else cell("")
            date_cell = cell(s["date"],   align=TA_CENTER, color=GREY_TEXT) if i == 0 else cell("")
            time_cell = cell(s["time"],   align=TA_CENTER, color=GREY_TEXT)
            subj_cell = cell(s["subject"], bold=True if orig_idx in test_row_indices else False)
            chap_cell = cell(s["chapter"] or "—",
                             color=BLACK if s["chapter"] else GREY_TEXT)
            teach_cell = cell(s["teacher"] or "—",
                              color=BLACK if s["teacher"] else GREY_TEXT,
                              align=TA_LEFT)

            data.append([day_cell, date_cell, time_cell, subj_cell, chap_cell, teach_cell])

            # ── Background colour rules ────────────────────────────────
            # Day & Date columns: always GREY_ROW
            style_cmds.append(("BACKGROUND", (0, row_idx), (1, row_idx), GREY_ROW))

            # Time/Subject/Chapter/Teacher columns:
            #   - Test rows  → SUNSET_TINT
            #   - Otherwise  → alternating stripe (odd=white, even=GREY_ROW)
            if orig_idx in test_row_indices:
                style_cmds.append(("BACKGROUND", (2, row_idx), (-1, row_idx), SUNSET_TINT))
            else:
                # row_idx is 1-based in table terms; we want odd-data-row=white, even=grey
                if (row_idx % 2) == 0:   # 2nd, 4th, 6th data row
                    style_cmds.append(("BACKGROUND", (2, row_idx), (-1, row_idx), GREY_ROW))
                # else leave white (default)

            row_idx += 1

        # Span Day & Date cells across the day's rows
        if len(sessions) > 1:
            style_cmds.append(("SPAN", (0, start_row), (0, row_idx - 1)))
            style_cmds.append(("SPAN", (1, start_row), (1, row_idx - 1)))
            style_cmds.append(("VALIGN", (0, start_row), (1, row_idx - 1), "MIDDLE"))

    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t


# ── SECTION BAR ───────────────────────────────────────────────────────────────
def section_bar(title):
    bar_style = ParagraphStyle(
        "bar", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=WHITE, leading=14, leftIndent=2
    )
    t = Table([[Paragraph(title, bar_style)]],
              colWidths=[W - MARGIN_L - MARGIN_R])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), NAVY),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("LINEBELOW",     (0,0), (-1,-1), 2.5, ORANGE),
    ]))
    return t


# ── EXAM CALLOUT BANNER ───────────────────────────────────────────────────────
def build_exam_callout(school, dates):
    usable_w = W - MARGIN_L - MARGIN_R
    callout_style = ParagraphStyle(
        "exam_callout", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=ORANGE, alignment=TA_CENTER, leading=14
    )
    text = f"School Exam Adjustment — {school}, {dates}"
    t = Table([[Paragraph(text, callout_style)]], colWidths=[usable_w])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), ORANGE_PALE),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("BOX",           (0,0), (-1,-1), 1, ORANGE),
    ]))
    return t


# ── NOTES BLOCK ───────────────────────────────────────────────────────────────
def build_notes_block(notes):
    """notes: list of strings. Returns a flowable list."""
    if not notes:
        return []

    label_style = ParagraphStyle(
        "notes_label", fontName="Helvetica-Bold", fontSize=10,
        textColor=NAVY, leading=14, spaceAfter=3
    )
    note_style = ParagraphStyle(
        "note_item", fontName="Helvetica", fontSize=9.5,
        textColor=BLACK, leading=13, leftIndent=4, spaceAfter=2
    )

    inner_rows = [[Paragraph(f"•&nbsp;&nbsp;{n}", note_style)] for n in notes]
    inner_table = Table(inner_rows, colWidths=[W - MARGIN_L - MARGIN_R - 10*mm])
    inner_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), ORANGE_PALE),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LINEBEFORE",    (0,0), (0,-1), 3, ORANGE),
    ]))

    return [
        Paragraph("Notes", label_style),
        inner_table,
    ]


# ── LEGEND ────────────────────────────────────────────────────────────────────
def build_legend():
    swatch = Table([[""]], colWidths=[6*mm], rowHeights=[4*mm])
    swatch.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), SUNSET_TINT),
        ("BOX",        (0,0), (-1,-1), 0.4, BORDER_GREY),
    ]))
    legend_text = Paragraph(
        "Highlighted row indicates a Test session.",
        ParagraphStyle("legend", fontSize=8.5, textColor=GREY_TEXT,
                       fontName="Helvetica-Oblique", leading=12)
    )
    legend = Table([[swatch, legend_text]], colWidths=[8*mm, None])
    legend.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 0),
    ]))
    return legend


# ── FOOTER ────────────────────────────────────────────────────────────────────
def add_footer(canvas, doc):
    canvas.saveState()
    usable_w = W - MARGIN_L - MARGIN_R
    y = MARGIN_B - 6*mm

    canvas.setStrokeColor(ORANGE)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN_L, y + 4*mm, MARGIN_L + usable_w, y + 4*mm)

    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GREY_TEXT)
    canvas.drawString(MARGIN_L, y, "Cocoon Group Tuition, Airoli, Navi Mumbai")
    canvas.drawRightString(MARGIN_L + usable_w, y, f"Page {doc.page}")
    canvas.restoreState()


# ── BUILD ─────────────────────────────────────────────────────────────────────
def build_pdf(output_path, config):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B + 8*mm,
        title=config["doc_title"],
        author="Cocoon Group Tuition",
    )

    body_style = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10.5, leading=15,
        textColor=BLACK, alignment=TA_LEFT, spaceAfter=6
    )
    salutation_style = ParagraphStyle(
        "salutation", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=BLACK, spaceAfter=4
    )
    signoff_style = ParagraphStyle(
        "signoff", fontName="Helvetica-Bold", fontSize=11,
        textColor=NAVY, leading=15, alignment=TA_LEFT
    )
    closing_note_style = ParagraphStyle(
        "closing", fontName="Helvetica", fontSize=10, leading=14,
        textColor=GREY_TEXT, alignment=TA_LEFT, spaceAfter=4
    )

    story = []

    story += build_header(
        grade_label=config["grade"],
        week_label=config["week_label"],
        date_str=config["date"]
    )

    story.append(Paragraph("Dear Parents / Guardians,", salutation_style))
    story.append(Paragraph(config["intro_one_liner"], body_style))

    if config.get("exam_school") and config.get("exam_dates"):
        story.append(Spacer(1, 2*mm))
        story.append(build_exam_callout(config["exam_school"], config["exam_dates"]))

    story.append(Spacer(1, 2*mm))
    story.append(build_schedule_table(
        config["schedule"],
        test_row_indices=config.get("test_row_indices", [])
    ))

    if config.get("test_row_indices"):
        story.append(Spacer(1, 2.5*mm))
        story.append(build_legend())

    # ── Notes (optional)
    notes = config.get("notes", [])
    if notes:
        story.append(Spacer(1, 5*mm))
        story += build_notes_block(notes)

    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(config["closing_note"], closing_note_style))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("With warm regards,", body_style))
    story.append(Paragraph("Cocoon Group Tuition, Airoli", signoff_style))

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"PDF saved → {output_path}")


# ── DATA ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    schedule = [
        {"day": "Tuesday",   "date": "5 May",  "time": "2:30 – 3:30 PM",
         "subject": "Maths",          "chapter": "Co-ordinate Geometry", "teacher": "Ayan Sir"},
        {"day": "Tuesday",   "date": "5 May",  "time": "3:30 – 4:30 PM",
         "subject": "English",        "chapter": "Reported Speech",      "teacher": "Ranjeet Sir"},

        {"day": "Wednesday", "date": "6 May",  "time": "2:30 – 3:30 PM",
         "subject": "Maths",          "chapter": "Co-ordinate Geometry", "teacher": "Ayan Sir"},
        {"day": "Wednesday", "date": "6 May",  "time": "3:30 – 4:30 PM",
         "subject": "Physics",        "chapter": "Motion",               "teacher": "Suraj Sir"},

        {"day": "Thursday",  "date": "7 May",  "time": "2:30 – 3:30 PM",
         "subject": "Maths",          "chapter": "Co-ordinate Geometry", "teacher": "Ayan Sir"},
        {"day": "Thursday",  "date": "7 May",  "time": "3:30 – 4:30 PM",
         "subject": "Maths Practice", "chapter": "Co-ordinate Geometry", "teacher": "Suraj Sir"},

        {"day": "Friday",    "date": "8 May",  "time": "2:30 – 3:30 PM",
         "subject": "Biology",        "chapter": "Cells",                "teacher": "Dr. Monish"},
        {"day": "Friday",    "date": "8 May",  "time": "3:30 – 4:30 PM",
         "subject": "Test",           "chapter": "Co-ordinate Geometry", "teacher": ""},

        {"day": "Saturday",  "date": "9 May",  "time": "2:30 – 3:30 PM",
         "subject": "English",        "chapter": "Grammar Practice",     "teacher": "Ranjeet Sir"},
        {"day": "Saturday",  "date": "9 May",  "time": "3:30 – 4:30 PM",
         "subject": "Maths Practice", "chapter": "Co-ordinate Geometry", "teacher": "Suraj Sir"},
    ]

    config = {
        "doc_title": "Weekly Schedule — Grade 9 (A & B) — 5–9 May 2026",
        "grade": "Grade 9 — Sections A &amp; B",
        "week_label": "5th – 9th May, 2026",
        "date": "4th May, 2026",
        "intro_one_liner":
            "Please find below the schedule for Grade 9 (Sections A &amp; B) "
            "for the week of 5th – 9th May, 2026. We request your support in "
            "ensuring punctual attendance for every session.",
        "schedule": schedule,
        "test_row_indices": [7],   # Friday Test row
        "notes": [
            "Friday's test will cover the Co-ordinate Geometry chapter only. "
            "Please ensure your child completes a thorough revision before the test.",
        ],
        "closing_note":
            "For any clarifications, please reach out to us. "
            "We look forward to a productive week ahead with our students.",
    }

    build_pdf(
        "/mnt/user-data/outputs/Cocoon_Schedule_Grade9_AB_Week_5-9May2026.pdf",
        config
    )
