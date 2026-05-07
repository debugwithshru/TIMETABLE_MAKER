document.addEventListener('DOMContentLoaded', () => {
    const daysContainer = document.getElementById('daysContainer');
    const dayTemplate = document.getElementById('dayTemplate').innerHTML;
    const lectureTemplate = document.getElementById('lectureTemplate').innerHTML;
    const form = document.getElementById('timetableForm');

    const notesContainer = document.getElementById('notesContainer');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const examNoticeFields = document.getElementById('examNoticeFields');
    const scheduleTypeRadios = document.querySelectorAll('input[name="schedule_type"]');

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const teachers = [
        "Suraj Sir", "Ranjeet Sir", "Dipti Ma'am", "Rachna Ma'am", 
        "Trupti Ma'am", "Prasad Sir", "Mana Ma'am", "Dr. Monish"
    ];

    const subjectsDb = {
        "Maths": ["Algebra", "Geometry"],
        "Science": ["Physics", "Chemistry", "Biology"],
        "Social Science": ["History", "Political Science", "Economics", "Geography"],
        "Languages": ["English", "Hindi", "Marathi", "Sanskrit"]
    };

    // Flatten subjects for searchable dropdown
    const allSubjectsForSearch = [];
    for (const [category, subjects] of Object.entries(subjectsDb)) {
        subjects.forEach(sub => allSubjectsForSearch.push({ category, name: sub }));
    }

    // Object to remember the very first time entered for a specific lecture number globally
    // e.g. "1_from": "10:00", "2_to": "12:00"
    const globalLectureTimes = {};

    // 0. Setup UI Toggles (Exam Notice & Notes)
    scheduleTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Exam') {
                examNoticeFields.style.display = 'grid';
                examNoticeFields.querySelectorAll('select, input').forEach(el => el.required = true);
            } else {
                examNoticeFields.style.display = 'none';
                examNoticeFields.querySelectorAll('select, input').forEach(el => el.required = false);
            }
        });
    });

    addNoteBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'note-row';
        row.innerHTML = `
            <input type="text" name="parent_notes[]" placeholder="Enter a note for parents...">
            <button type="button" class="remove-note-btn" onclick="this.parentElement.remove()">✕</button>
        `;
        notesContainer.appendChild(row);
    });

    // 1. Generate Days Sections
    daysOfWeek.forEach((day, index) => {
        let html = dayTemplate
            .replace(/{day}/g, day.toLowerCase())
            .replace(/{DayName}/g, day);
        
        daysContainer.insertAdjacentHTML('beforeend', html);
    });

    // 2. Setup Event Listeners for Days
    daysOfWeek.forEach((day, index) => {
        const dayLower = day.toLowerCase();
        const section = document.getElementById(`day_section_${dayLower}`);
        const holidayRadios = section.querySelectorAll(`input[name="holiday_${dayLower}"]`);
        const lectureCountInput = section.querySelector(`input[name="lecture_count_${dayLower}"]`);
        const lecturesContainer = document.getElementById(`lectures_${dayLower}`);
        const dateInput = section.querySelector(`input[name="date_${dayLower}"]`);

        // Setup auto-calculate dates for the rest of the week based on any day selected
        dateInput.addEventListener('change', (e) => {
            const selectedDate = new Date(e.target.value);
            if (isNaN(selectedDate.getTime())) return;

            // Find current day's offset relative to Monday (0 for Monday, 6 for Sunday)
            const currentOffset = index;

            daysOfWeek.forEach((d, i) => {
                if (i === currentOffset) return; // Skip self
                
                const targetDate = new Date(selectedDate);
                targetDate.setDate(selectedDate.getDate() + (i - currentOffset));
                
                const targetDateInput = document.querySelector(`input[name="date_${d.toLowerCase()}"]`);
                if (targetDateInput) {
                    targetDateInput.value = targetDate.toISOString().split('T')[0];
                }
            });
        });

        // Holiday toggle logic
        holidayRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Yes') {
                    section.classList.add('holiday-active');
                    lectureCountInput.value = '';
                    lecturesContainer.innerHTML = ''; // Clear lectures
                } else {
                    section.classList.remove('holiday-active');
                }
            });
        });

        // Lecture Count Logic
        lectureCountInput.addEventListener('input', (e) => {
            let count = parseInt(e.target.value) || 0;
            if (count > 10) count = 10; // Max limit
            
            renderLectures(dayLower, count, lecturesContainer);
        });
    });

    // 3. Render Lecture Blocks
    function renderLectures(dayLower, count, container) {
        // Keep existing if count increases, slice if count decreases
        const existingCount = container.children.length;

        if (count < existingCount) {
            // Remove excess
            while(container.children.length > count) {
                container.removeChild(container.lastChild);
            }
        } else if (count > existingCount) {
            // Add new
            for (let i = existingCount + 1; i <= count; i++) {
                let lectureHtml = lectureTemplate
                    .replace(/{day}/g, dayLower)
                    .replace(/{lectureNum}/g, i);
                
                container.insertAdjacentHTML('beforeend', lectureHtml);
                const newLecture = container.lastElementChild;
                
                // If a global first-time was already recorded for this lecture number, prepopulate it automatically!
                if (globalLectureTimes[`${i}_from_hr`]) {
                    newLecture.querySelector(`input[name="hr_from_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_from_hr`];
                    newLecture.querySelector(`input[name="min_from_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_from_min`];
                    newLecture.querySelector(`select[name="ampm_from_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_from_ampm`];
                }
                if (globalLectureTimes[`${i}_to_hr`]) {
                    newLecture.querySelector(`input[name="hr_to_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_to_hr`];
                    newLecture.querySelector(`input[name="min_to_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_to_min`];
                    newLecture.querySelector(`select[name="ampm_to_${dayLower}_${i}"]`).value = globalLectureTimes[`${i}_to_ampm`];
                }

                setupLectureDropdowns(newLecture, dayLower, i);
            }
        }
    }

    // 4. Setup Custom Subject Dropdown & Teachers Select
    function setupLectureDropdowns(lectureElement, dayLower, lectureNum) {
        // Populate Teachers
        const teacherSelect = lectureElement.querySelector(`select[name="teacher_${dayLower}_${lectureNum}"]`);
        teachers.forEach(teacher => {
            const opt = document.createElement('option');
            opt.value = teacher;
            opt.textContent = teacher;
            teacherSelect.appendChild(opt);
        });

        // Setup Searchable Subject
        const searchInput = lectureElement.querySelector('.subject-search');
        const hiddenInput = lectureElement.querySelector(`input[name="subject_${dayLower}_${lectureNum}"]`);
        const dropdownList = lectureElement.querySelector('.subject-list');
        const searchContainer = lectureElement.querySelector('.searchable-dropdown');

        function renderSubjects(query = "") {
            dropdownList.innerHTML = '';
            let currentCategory = '';
            
            const filtered = allSubjectsForSearch.filter(sub => 
                sub.name.toLowerCase().includes(query.toLowerCase()) || 
                sub.category.toLowerCase().includes(query.toLowerCase())
            );

            if (filtered.length === 0) {
                dropdownList.innerHTML = '<div class="dropdown-item no-results">No subjects found.</div>';
                return;
            }

            filtered.forEach(sub => {
                if (currentCategory !== sub.category) {
                    const catDiv = document.createElement('div');
                    catDiv.className = 'dropdown-category';
                    catDiv.textContent = sub.category;
                    dropdownList.appendChild(catDiv);
                    currentCategory = sub.category;
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';
                itemDiv.textContent = sub.name;
                
                itemDiv.onclick = (e) => {
                    e.preventDefault();
                    searchInput.value = sub.name;
                    hiddenInput.value = sub.name;
                    dropdownList.classList.remove('active');
                };

                dropdownList.appendChild(itemDiv);
            });
        }

        searchInput.addEventListener('focus', () => {
            dropdownList.classList.add('active');
            renderSubjects(searchInput.value);
        });

        searchInput.addEventListener('input', (e) => {
            dropdownList.classList.add('active');
            renderSubjects(e.target.value);
            hiddenInput.value = ''; // clear hidden if they type something new
        });

        // Close dropdown when clicked outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                dropdownList.classList.remove('active');
                // Auto correct if they didn't pick from list
                if (searchInput.value && !hiddenInput.value) {
                    const match = allSubjectsForSearch.find(s => s.name.toLowerCase() === searchInput.value.toLowerCase());
                    if (match) {
                        searchInput.value = match.name;
                        hiddenInput.value = match.name;
                    } else {
                        searchInput.value = '';
                    }
                }
            }
        });
    }

    // 5. Cross-Day Lecture Timing Sync (Custom Inputs)
    daysContainer.addEventListener('change', (e) => {
        // match hr_from_monday_1, min_from_monday_1, etc
        const nameMatch = e.target.name.match(/(hr|min|ampm)_(from|to)_([a-z]+)_(\d+)/);
        if (!nameMatch) return;

        const [_, segment, type, sourceDay, lectureNum] = nameMatch;
        
        // Let's get the full custom time object for this source block
        const hr = form.querySelector(`input[name="hr_${type}_${sourceDay}_${lectureNum}"]`)?.value;
        const min = form.querySelector(`input[name="min_${type}_${sourceDay}_${lectureNum}"]`)?.value;
        const ampm = form.querySelector(`select[name="ampm_${type}_${sourceDay}_${lectureNum}"]`)?.value;

        // Ensure hour and min drop zeroes correctly (1 to 01 etc internally, but keep as they typed)
        if (hr && min) {
            const hrPad = hr.padStart(2, '0');
            const minPad = min.padStart(2, '0');

            // Format global keys
            const keyHr = `${lectureNum}_${type}_hr`;
            const keyMin = `${lectureNum}_${type}_min`;
            const keyAmpm = `${lectureNum}_${type}_ampm`;

            // If this is the FIRST completely filled time for this lecture number globally
            if (!globalLectureTimes[keyHr]) {
                globalLectureTimes[keyHr] = hrPad;
                globalLectureTimes[keyMin] = minPad;
                globalLectureTimes[keyAmpm] = ampm;

                // Sync immediately to any currently existing empty inputs for this lecture across all days
                daysOfWeek.forEach(d => {
                    const targetDay = d.toLowerCase();
                    if (targetDay === sourceDay) return;

                    const tHrIn = document.querySelector(`input[name="hr_${type}_${targetDay}_${lectureNum}"]`);
                    const tMinIn = document.querySelector(`input[name="min_${type}_${targetDay}_${lectureNum}"]`);
                    const tAmpmSel = document.querySelector(`select[name="ampm_${type}_${targetDay}_${lectureNum}"]`);

                    if (tHrIn && tMinIn && tAmpmSel) {
                        if (!tHrIn.value && !tMinIn.value) {
                            tHrIn.value = hrPad;
                            tMinIn.value = minPad;
                            tAmpmSel.value = ampm;
                        }
                    }
                });
            }
        }
    });

    // 6. Form Submission Logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Generating PDF...';

        const formData = new FormData(form);
        const batches = Array.from(form.querySelectorAll('input[name="batch"]:checked')).map(cb => cb.value);

        if (batches.length === 0) {
            alert("Please select at least one Batch.");
            btn.disabled = false;
            btn.textContent = 'Submit Timetable';
            return;
        }

        // Loop through days and gather payload dynamically
        const timetableData = {};
        const schedule = [];
        const testRowIndices = [];
        let scheduleIdx = 0;

        for (const day of daysOfWeek) {
            const dayLower = day.toLowerCase();
            const isHoliday = formData.get(`holiday_${dayLower}`) === 'Yes';
            const dateVal = formData.get(`date_${dayLower}`);
            
            const dayObj = { date: dateVal, holiday: isHoliday, lectures: [] };

            if (!isHoliday) {
                const lCount = parseInt(formData.get(`lecture_count_${dayLower}`)) || 0;
                for (let i = 1; i <= lCount; i++) {
                    const subj = formData.get(`subject_${dayLower}_${i}`);
                    if (!subj) {
                        alert(`Please select a valid subject for ${day} Lecture ${i}`);
                        btn.disabled = false; btn.textContent = 'Submit Timetable';
                        return;
                    }

                    const getTimeString = (d, num, t) => {
                        const h = formData.get(`hr_${t}_${d}_${num}`);
                        const m = formData.get(`min_${t}_${d}_${num}`);
                        const a = formData.get(`ampm_${t}_${d}_${num}`);
                        return (h && m) ? `${h.padStart(2,'0')}:${m.padStart(2,'0')} ${a}` : '';
                    };
                    const timeFrom = getTimeString(dayLower, i, 'from');
                    const timeTo = getTimeString(dayLower, i, 'to');

                    if (!timeFrom || !timeTo) {
                        alert(`Please fill Hours and Minutes for ${day} Lecture ${i}`);
                        btn.disabled = false; btn.textContent = 'Submit Timetable';
                        return;
                    }

                    const isTest = formData.get(`is_test_${dayLower}_${i}`) === 'Yes';
                    if (isTest) testRowIndices.push(scheduleIdx);

                    const formatDate = (iso) => {
                        if (!iso) return '';
                        const d = new Date(iso);
                        return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                    };

                    schedule.push({
                        day: day,
                        date: formatDate(dateVal),
                        time: `${timeFrom} to ${timeTo}`,
                        subject: subj,
                        chapter: formData.get(`topic_${dayLower}_${i}`) || '',
                        teacher: formData.get(`teacher_${dayLower}_${i}`)
                    });
                    scheduleIdx++;

                    dayObj.lectures.push({
                        lecture_num: i, time_from: timeFrom, time_to: timeTo,
                        subject: subj, topic: formData.get(`topic_${dayLower}_${i}`),
                        teacher: formData.get(`teacher_${dayLower}_${i}`), is_test: isTest
                    });
                }
            }
            timetableData[day] = dayObj;
        }

        // Gather notes
        const notes = [];
        document.querySelectorAll('#notesContainer input[name="parent_notes[]"]').forEach(input => {
            if (input.value.trim()) notes.push(input.value.trim());
        });

        // Determine week label from first/last dates
        const dayKeys = Object.keys(timetableData);
        const firstDate = timetableData[dayKeys[0]]?.date;
        const lastDate = timetableData[dayKeys[dayKeys.length - 1]]?.date;
        const fmtWeekDate = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            const day = d.getDate();
            const month = d.toLocaleString('en-US', { month: 'long' });
            return `${day} ${month}`;
        };
        const weekLabel = `${fmtWeekDate(firstDate)} - ${fmtWeekDate(lastDate)}`;

        const isExam = formData.get('schedule_type') === 'Exam';
        const config = {
            grade: formData.get('grade'),
            batches: batches.join(', '),
            week_label: weekLabel,
            exam_school: isExam ? formData.get('exam_school') : null,
            exam_dates: isExam ? formData.get('exam_dates') : null,
            schedule: schedule,
            test_row_indices: testRowIndices,
            notes: notes
        };

        try {
            btn.textContent = 'Generating PDF...';
            const pdfBlob = await generatePDF(config);

            // Build multipart FormData payload
            const grade = formData.get('grade');
            const batchStr = batches.join(',');
            const fileName = `Cocoon_Schedule_Grade${grade}_${batchStr}_${new Date().toISOString().split('T')[0]}.pdf`;

            const submitData = new FormData();
            submitData.append('pdf', pdfBlob, fileName);
            submitData.append('config_json', JSON.stringify({
                ...config,
                timetable: timetableData,
                made_by: formData.get('made_by'),
                branch: formData.get('branch'),
                submission_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            }));
            submitData.append('made_by', formData.get('made_by'));
            submitData.append('grade', grade);
            submitData.append('batch', batchStr);
            submitData.append('branch', formData.get('branch'));
            submitData.append('submission_date', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            submitData.append('timetable', JSON.stringify(timetableData));

            btn.textContent = 'Submitting...';

            const WEBHOOK_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/f2a69329-3814-4cb5-9123-7c1c3d063421';
            const response = await fetch(WEBHOOK_URL, { method: 'POST', body: submitData });

            if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);

            document.getElementById('successOverlay').classList.add('active');
            setTimeout(() => window.location.reload(), 3000);

        } catch (error) {
            console.error('Submission Error:', error);
            document.getElementById('errorOverlay').classList.add('active');
            btn.disabled = false;
            btn.textContent = 'Submit Timetable';
        }
    });

    // 8. Restore Browser bfcache State on Load or Back-Arrow
    const syncBrowserState = () => {
        document.querySelectorAll('input[type="radio"][value="Yes"]:checked').forEach(radio => {
            if (radio.name.startsWith('holiday_')) radio.dispatchEvent(new Event('change'));
        });
        document.querySelectorAll('input.lecture-count').forEach(input => {
            if (input.value) input.dispatchEvent(new Event('input'));
        });
        const checkedType = document.querySelector('input[name="schedule_type"]:checked');
        if (checkedType) checkedType.dispatchEvent(new Event('change'));
    };

    setTimeout(syncBrowserState, 100);
    window.addEventListener('pageshow', (e) => { if (e.persisted) syncBrowserState(); });

    // 9. Client-side PDF Generation using jsPDF (Pixel-Perfect with Python Reference)
    async function generatePDF(config) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        // Exact Brand Colors
        const NAVY = [27, 42, 74];
        const ORANGE = [232, 119, 34];
        const ORANGE_PALE = [255, 243, 232];
        const SUNSET_TINT = [255, 228, 210];
        const GREY_ROW = [240, 244, 248];
        const BLACK = [26, 26, 26];
        const GREY_TEXT = [85, 85, 85];
        const BORDER_GREY = [218, 221, 227];

        const MARGIN_L = 18;
        const MARGIN_R = 18;
        const USABLE_W = 210 - MARGIN_L - MARGIN_R;

        // Load logo
        const logoImg = document.querySelector('header .logo');
        let logoDataUrl = null;
        if (logoImg) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth || 100;
                canvas.height = logoImg.naturalHeight || 100;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                logoDataUrl = canvas.toDataURL('image/png');
            } catch(e) { console.warn('Could not load logo:', e); }
        }

        // --- 1. HEADER ---
        if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', MARGIN_L, 14, 18, 20);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...ORANGE);
        doc.text("COCOON", 40, 19);
        doc.setTextColor(...NAVY);
        // Measure "COCOON" width to place " GROUP TUITION" right after it
        const cocoonWidth = doc.getTextWidth("COCOON");
        doc.text(" GROUP TUITION", 40 + cocoonWidth, 19);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(...GREY_TEXT);
        doc.text("A Tutorial to Transform Your Child", 40, 24);

        // Divider Line
        doc.setDrawColor(...ORANGE);
        doc.setLineWidth(0.7); // approx 2pt
        doc.line(MARGIN_L, 36, 210 - MARGIN_R, 36);

        // --- 2. TITLE SECTION ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...NAVY);
        const titleText = `WEEKLY SCHEDULE — ${config.week_label}`;
        doc.text(titleText, 105, 45, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(...ORANGE);
        // Fix encoded ampersands if they exist from HTML
        const cleanGrade = config.grade.replace(/&amp;/g, '&');
        const gradeText = `${cleanGrade} — Sections ${config.batches}`;
        doc.text(gradeText, 105, 52, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GREY_TEXT);
        const today = new Date().toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        doc.text(`Issued: ${today}`, 210 - MARGIN_R, 58, { align: 'right' });

        // --- 3. SALUTATION & INTRO ---
        let currentY = 65;
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BLACK);
        doc.text("Dear Parents / Guardians,", MARGIN_L, currentY);
        currentY += 6;

        doc.setFont("helvetica", "normal");
        const introText = config.exam_school 
            ? `Please find below the adjusted schedule for ${cleanGrade} during the upcoming ${config.exam_school} school examinations.`
            : `Please find below the schedule for ${cleanGrade} (Sections ${config.batches}) for the week of ${config.week_label}. We request your support in ensuring punctual attendance for every session.`;
        
        const splitIntro = doc.splitTextToSize(introText, USABLE_W);
        doc.text(splitIntro, MARGIN_L, currentY);
        currentY += (splitIntro.length * 5) + 4;

        // --- 4. EXAM CALLOUT ---
        if (config.exam_school) {
            doc.setDrawColor(...ORANGE);
            doc.setFillColor(...ORANGE_PALE);
            doc.setLineWidth(0.35);
            doc.rect(MARGIN_L, currentY, USABLE_W, 10, 'FD');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(...ORANGE);
            doc.text(`School Exam Adjustment — ${config.exam_school}, ${config.exam_dates}`, 105, currentY + 6.5, { align: 'center' });
            currentY += 15;
        }

        // --- 5. TABLE (WITH CHUNKING FOR PAGE BREAKS) ---
        const DAY_ABBREV = { "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun" };
        
        // Group sessions by day
        const dayGroups = {};
        config.schedule.forEach((s, idx) => {
            if (!dayGroups[s.day]) dayGroups[s.day] = [];
            dayGroups[s.day].push({ ...s, origIdx: idx });
        });

        const tableChunks = [];
        let currentChunk = [];
        let currentChunkSize = 0;
        const MAX_LECTURES_PER_PAGE = 10;
        let rowIdx = 0;

        for (const day in dayGroups) {
            const sessions = dayGroups[day];
            
            // If adding this day exceeds limits and we already have rows, push to next chunk to avoid splitting days
            if (currentChunkSize + sessions.length > MAX_LECTURES_PER_PAGE && currentChunkSize > 0) {
                tableChunks.push(currentChunk);
                currentChunk = [];
                currentChunkSize = 0;
            }
            
            sessions.forEach((s, i) => {
                const row = [];
                if (i === 0) {
                    row.push({ content: DAY_ABBREV[s.day] || s.day, rowSpan: sessions.length, styles: { fontStyle: 'bold', textColor: NAVY, fillColor: GREY_ROW, halign: 'center', valign: 'middle' } });
                    
                    let displayDate = s.date;
                    if (displayDate) {
                        const parts = displayDate.split('-');
                        if (parts.length === 3) {
                            const d = new Date(parts[2], parseInt(parts[1])-1, parts[0]);
                            displayDate = `${d.getDate()} ${d.toLocaleString('en-US', {month:'short'})}`;
                        }
                    }
                    row.push({ content: displayDate, rowSpan: sessions.length, styles: { textColor: GREY_TEXT, fillColor: GREY_ROW, halign: 'center', valign: 'middle' } });
                }
                
                const isTest = config.test_row_indices.includes(s.origIdx);
                const fillColor = isTest ? SUNSET_TINT : (rowIdx % 2 === 0 ? [255,255,255] : GREY_ROW);
                const subjStyle = isTest ? 'bold' : 'normal';
                
                row.push({ content: s.time, styles: { textColor: GREY_TEXT, fillColor: fillColor, halign: 'center' } });
                row.push({ content: s.subject, styles: { fontStyle: subjStyle, fillColor: fillColor, halign: 'left', textColor: BLACK } });
                row.push({ content: s.chapter || '—', styles: { textColor: s.chapter ? BLACK : GREY_TEXT, fillColor: fillColor, halign: 'left' } });
                row.push({ content: s.teacher || '—', styles: { textColor: s.teacher ? BLACK : GREY_TEXT, fillColor: fillColor, halign: 'left' } });
                
                currentChunk.push(row);
                rowIdx++;
            });
            currentChunkSize += sessions.length;
        }
        if (currentChunk.length > 0) {
            tableChunks.push(currentChunk);
        }

        tableChunks.forEach((chunk, index) => {
            if (index > 0) {
                doc.addPage();
                currentY = 20; // reset Y for new page
            }
            
            doc.autoTable({
                startY: currentY,
                head: [['Day', 'Date', 'Time', 'Subject', 'Chapter / Topic', 'Teacher']],
                body: chunk,
                margin: { left: MARGIN_L, right: MARGIN_R },
                theme: 'grid',
                headStyles: { 
                    fillColor: NAVY, 
                    textColor: [255,255,255], 
                    fontStyle: 'bold',
                    lineColor: BORDER_GREY,
                    lineWidth: 0.1,
                    halign: 'center'
                },
                styles: { 
                    font: 'helvetica',
                    fontSize: 9.5, 
                    cellPadding: 2.5, 
                    valign: 'middle',
                    lineColor: BORDER_GREY,
                    lineWidth: 0.1
                },
                columnStyles: {
                    0: { cellWidth: 16 },
                    1: { cellWidth: 18 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 26, halign: 'left' },
                    4: { halign: 'left' }, // Flex width
                    5: { cellWidth: 26, halign: 'left' }
                },
                didParseCell: function(data) {
                    if (data.section === 'head' && [3,4,5].includes(data.column.index)) {
                        data.cell.styles.halign = 'left';
                    }
                }
            });
            currentY = doc.lastAutoTable.finalY + 4;
        });

        // Ensure there is enough space for Legend, Notes, and Closing (Approx 70mm needed)
        if (currentY > 210) {
            doc.addPage();
            currentY = 20;
        }

        // --- 6. LEGEND ---
        if (config.test_row_indices && config.test_row_indices.length > 0) {
            doc.setDrawColor(...BORDER_GREY);
            doc.setFillColor(...SUNSET_TINT);
            doc.setLineWidth(0.1);
            doc.rect(MARGIN_L, currentY, 6, 4, 'FD');
            
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8.5);
            doc.setTextColor(...GREY_TEXT);
            doc.text("Highlighted row indicates a Test session.", MARGIN_L + 8, currentY + 3.2);
            currentY += 8;
        }

        currentY += 2;

        // --- 7. NOTES BLOCK ---
        if (config.notes && config.notes.length > 0) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...NAVY);
            doc.text("Notes", MARGIN_L, currentY);
            currentY += 4;

            // Calculate notes box height
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            let notesHeight = 6; // padding top + bottom
            const noteLines = [];
            config.notes.forEach(note => {
                const splitNote = doc.splitTextToSize(`•  ${note}`, USABLE_W - 8);
                noteLines.push(splitNote);
                notesHeight += (splitNote.length * 4.5) + 1;
            });

            doc.setFillColor(...ORANGE_PALE);
            doc.setDrawColor(...ORANGE);
            doc.setLineWidth(0.8);
            // Draw background
            doc.rect(MARGIN_L, currentY, USABLE_W, notesHeight, 'F');
            // Draw left border
            doc.line(MARGIN_L, currentY, MARGIN_L, currentY + notesHeight);

            let noteY = currentY + 5;
            doc.setTextColor(...BLACK);
            noteLines.forEach(lines => {
                doc.text(lines, MARGIN_L + 4, noteY);
                noteY += (lines.length * 4.5) + 1;
            });

            currentY += notesHeight + 6;
        } else {
            currentY += 4;
        }

        // --- 8. CLOSING & SIGN-OFF ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...GREY_TEXT);
        const closingText = "For any clarifications, please reach out to us. We look forward to a productive week ahead with our students.";
        const splitClosing = doc.splitTextToSize(closingText, USABLE_W);
        doc.text(splitClosing, MARGIN_L, currentY);
        currentY += (splitClosing.length * 5) + 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...BLACK);
        doc.text("With warm regards,", MARGIN_L, currentY);
        currentY += 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...NAVY);
        doc.text("Cocoon Group Tuition, Airoli", MARGIN_L, currentY);

        // --- 9. FOOTER (ON EVERY PAGE) ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = 297 - 16 - 6; // A4 height - Bottom Margin - offset
            
            doc.setDrawColor(...ORANGE);
            doc.setLineWidth(0.5);
            doc.line(MARGIN_L, footerY + 4, 210 - MARGIN_R, footerY + 4);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...GREY_TEXT);
            doc.text("Cocoon Group Tuition, Airoli, Navi Mumbai", MARGIN_L, footerY);
            doc.text(`Page ${i}`, 210 - MARGIN_R, footerY, { align: 'right' });
        }

        return doc.output('blob');
    }
});

