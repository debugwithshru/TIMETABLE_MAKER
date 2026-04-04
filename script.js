document.addEventListener('DOMContentLoaded', () => {
    const daysContainer = document.getElementById('daysContainer');
    const dayTemplate = document.getElementById('dayTemplate').innerHTML;
    const lectureTemplate = document.getElementById('lectureTemplate').innerHTML;
    const form = document.getElementById('timetableForm');

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
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Gather Data
        const formData = new FormData(form);
        const params = new URLSearchParams();

        // Custom handling for multiple batches
        const batches = [];
        form.querySelectorAll('input[name="batch"]:checked').forEach(cb => {
            batches.push(cb.value);
        });
        
        if (batches.length === 0) {
            alert("Please select at least one Batch.");
            return;
        }

        // Loop through days and gather payload dynamically
        const timetableData = {};
        for (const day of daysOfWeek) {
            const dayLower = day.toLowerCase();
            const isHoliday = formData.get(`holiday_${dayLower}`) === 'Yes';
            const dateVal = formData.get(`date_${dayLower}`);
            
            const dayObj = {
                date: dateVal,
                holiday: isHoliday,
                lectures: []
            };

            if (!isHoliday) {
                const lCount = parseInt(formData.get(`lecture_count_${dayLower}`)) || 0;
                for(let i=1; i<=lCount; i++) {
                    // Check if Subject is actually selected
                    const subj = formData.get(`subject_${dayLower}_${i}`);
                    if (!subj) {
                        alert(`Please select a valid subject from the dropdown for ${day} Lecture ${i}`);
                        return; // Halt submission
                    }

                    // Format the custom pickers to HH:MM AM/PM
                    const getTimeString = (d, num, t) => {
                        const h = formData.get(`hr_${t}_${d}_${num}`);
                        const m = formData.get(`min_${t}_${d}_${num}`);
                        const a = formData.get(`ampm_${t}_${d}_${num}`);
                        return (h && m) ? `${h.padStart(2, '0')}:${m.padStart(2, '0')} ${a}` : '';
                    };

                    const timeFrom = getTimeString(dayLower, i, 'from');
                    const timeTo = getTimeString(dayLower, i, 'to');

                    if (!timeFrom || !timeTo) {
                        alert(`Please completely fill Hours and Minutes for ${day} Lecture ${i}`);
                        return; // Halt submission
                    }

                    dayObj.lectures.push({
                        lecture_num: i,
                        time_from: timeFrom,
                        time_to: timeTo,
                        subject: subj,
                        topic: formData.get(`topic_${dayLower}_${i}`),
                        teacher: formData.get(`teacher_${dayLower}_${i}`)
                    });
                }
            }
            timetableData[day] = dayObj;
        }

        // Calculate dynamic height for n8n screenshot
        let totalLecRows = 0;
        let dayCount = 0;
        for (const day in timetableData) {
            if (timetableData[day].lectures.length > 0 && !timetableData[day].holiday) {
                totalLecRows += timetableData[day].lectures.length;
                dayCount++;
            }
        }
        // Base headers (~280) + Table Header (~60) + (Rows * 65) + Bottom Padding (~80)
        const calcHeight = 280 + 60 + (totalLecRows * 65) + 80;

        const finalPayload = {
            made_by: formData.get('made_by'),
            grade: formData.get('grade'),
            batch: batches.join(','),
            branch: formData.get('branch'),
            submission_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            timetable: timetableData,
            calculated_height: calcHeight
        };

        // Generate the gorgeous HTML components for n8n
        const htmlParts = generateTimetableHTML(finalPayload);
        finalPayload.html_full = htmlParts.full;
        finalPayload.html_body = htmlParts.body;
        finalPayload.html_css = htmlParts.css;

        // Submit to Webhook via JSON POST request
        const WEBHOOK_URL = 'https://n8n.srv1498466.hstgr.cloud/webhook/f2a69329-3814-4cb5-9123-7c1c3d063421';
        
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        fetch(WEBHOOK_URL, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(finalPayload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Webhook returned HTTP ${response.status}`);
            }
            document.getElementById('successOverlay').classList.add('active');
            
            // Optional: reset form after success
            setTimeout(() => {
                window.location.reload(); 
            }, 3000);
        })
        .catch(error => {
            console.error('Submission Error:', error);
            document.getElementById('errorOverlay').classList.add('active');
            btn.disabled = false;
            btn.textContent = 'Submit';
        });
    });

    // ==========================================
    // 8. Restore Browser bfcache State on Load or Back-Arrow
    // ==========================================
    const syncBrowserState = () => {
        // Trigger holiday toggles to visually sync CSS if browser marked them as "Yes"
        document.querySelectorAll('input[type="radio"][value="yes"]:checked').forEach(radio => {
            if (radio.name.startsWith('holiday_')) {
                radio.dispatchEvent(new Event('change'));
            }
        });
        
        // Retrigger any cached lecture count numbers to regenerate visual DOM chunks
        document.querySelectorAll('input.lecture-count').forEach(input => {
            if (input.value) {
                input.dispatchEvent(new Event('input'));
            }
        });
    };

    setTimeout(syncBrowserState, 100);

    // If user hit the back/forward arrow, the 'pageshow' event triggers it safely
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) syncBrowserState();
    });

            function generateTimetableHTML(payload) {
        let titleElements = [];
        titleElements.push("GRADE " + payload.grade);
        const subtitleText = titleElements.join(' - ');

        let startDateStr = '';
        let endDateStr = '';
        const dayKeys = Object.keys(payload.timetable);
        if (dayKeys.length > 0) {
            const firstDateStr = payload.timetable[dayKeys[0]].date;
            const lastDateStr = payload.timetable[dayKeys[dayKeys.length - 1]].date;
            
            const formatDate = (isoString) => {
                if (!isoString) return '';
                const d = new Date(isoString);
                if (isNaN(d.getTime())) return isoString;
                const day = d.getDate();
                const suffix = ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10) * (day % 10)];
                const month = d.toLocaleString('en-US', { month: 'long' });
                return `${day} ${month}`; // user mockup just says 6th April (well without th in my format here, wait: 6th April. I'll keep default.)
            };
            startDateStr = formatDate(firstDateStr);
            endDateStr = formatDate(lastDateStr);
        }

        const parseFormatDate = (ds) => {
            if (!ds) return '';
            const d = new Date(ds);
            return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
        };

        const logoBase64 = "data:image/webp;base64,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";

        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
            
            :root {
                --primary: #f39200;
                --text-dark: #2d2a26;
                --border: #4a4a4a;
            }
            
            body { 
                font-family: 'Outfit', sans-serif; 
                margin: 0; 
                padding: 0;
                background: #fdfaf6; 
                color: var(--text-dark); 
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .timetable-wrapper {
                width: 960px; /* Increased width to provide more horizontal space for all 5 columns */
                position: relative;
                padding: 40px;
                background: #fdfaf6;
                box-sizing: border-box;
                z-index: 1;
                overflow: hidden;
                margin: 0 auto;
            }

            /* Watermark Logo */
            .timetable-wrapper::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                height: 600px;
                background-image: url('${logoBase64}');
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                opacity: 0.04;
                z-index: -1;
            }

            .header-logo {
                position: absolute;
                top: 30px;
                left: 30px;
                width: 100px; 
            }

            .header-text { 
                text-align: center; 
                margin-top: 5px;
                margin-bottom: 25px;
            }

            .header-text h1 { 
                font-size: 26px; 
                margin: 0 0 5px 0; 
                letter-spacing: 1px; 
                font-weight: 700; 
                color: var(--text-dark);
                text-transform: uppercase; 
            }

            .header-text h2 { 
                color: var(--primary); 
                font-size: 18px; 
                margin: 0 0 5px 0; 
                font-weight: 700; 
                letter-spacing: 0.5px; 
                text-transform: uppercase;
            }

            .header-text h3 { 
                color: #666; 
                font-size: 16px; 
                margin: 0; 
                font-weight: 500; 
                text-transform: uppercase;
            }

            .note-text {
                font-size: 14px;
                margin-bottom: 12px;
                font-weight: 400;
                color: #4a4a4a;
            }

            table { 
                width: 100%; 
                border-collapse: collapse; 
                border: 2px solid var(--border);
                background: transparent;
            }
            
            th, td { 
                padding: 12px 16px; 
                text-align: center; 
                border: 1px solid var(--border);
                font-size: 15px;
            }
            
            thead th { 
                background-color: transparent;
                position: relative;
                color: var(--text-dark); 
                font-weight: 700; 
                text-transform: uppercase; 
                border: 2px solid var(--border);
                z-index: 1;
            }
            /* The image had a sort of brush stroke underlying the table heads. We simulate it cleanly with an inset background block that looks like a painted strip */
            thead th::before {
                content: '';
                position: absolute;
                top: 2px; bottom: 2px; left: 2px; right: 2px;
                background-color: #f7b778;
                opacity: 0.8;
                z-index: -1;
            }
            
            tbody tr { 
                background-color: transparent; 
            }
            
            .day-col { 
                font-weight: 700; 
                font-size: 16px; 
                text-transform: uppercase;
                width: 12%; /* Slightly reduced to give more to others */
                vertical-align: middle;
            }

            .day-date {
                display: block;
                font-size: 12px;
                color: #555;
                font-weight: 400;
                margin-top: 4px;
            }

            .time-col { 
                font-weight: 500; 
                width: 28%; 
                white-space: nowrap; /* Strictly forbids wrapping */
            }

            .subj-col { 
                font-weight: 700; 
                width: 19%; 
                text-transform: uppercase;
            }

            .topic-col { 
                font-weight: 400; 
                width: 21%; 
            }
            
            .teacher-col { 
                font-weight: 600; 
                width: 20%; 
                text-transform: uppercase;
                white-space: nowrap; /* Strictly forbids wrapping */
            }
        `;

        let rowsHTML = '';
        dayKeys.forEach(day => {
            const dayInfo = payload.timetable[day];
            if (dayInfo.holiday || dayInfo.lectures.length === 0) return;

            dayInfo.lectures.forEach((lec, idx) => {
                rowsHTML += `<tr>`;
                if (idx === 0) {
                    rowsHTML += `<td class="day-col" rowspan="${dayInfo.lectures.length}">
                        ${day} <br>
                        <span class="day-date">(${parseFormatDate(dayInfo.date)})</span>
                    </td>`;
                }
                rowsHTML += `<td class="time-col">${lec.time_from} to ${lec.time_to}</td>`;
                rowsHTML += `<td class="subj-col">${lec.subject}</td>`;
                rowsHTML += `<td class="topic-col">${lec.topic || ''}</td>`;
                rowsHTML += `<td class="teacher-col">${lec.teacher}</td>`;
                rowsHTML += `</tr>`;
            });
        });

        if (rowsHTML === '') {
            rowsHTML = `<tr><td colspan="4" style="text-align:center; padding: 30px; color: #7f8c8d;">No schedule available.</td></tr>`;
        }

        const tableHTML = `
    <div class="timetable-wrapper">
        <img class="header-logo" src="${logoBase64}" alt="Cocoon Logo">
        
        <div class="header-text">
            <h1>COCOON GROUP TUITIONS</h1>
            <h2>WEEKLY TIMETABLE</h2>
            <h3>${subtitleText}</h3>
        </div>
        
        <div class="note-text">Note: The following timetable is to be followed from <strong>${startDateStr} to ${endDateStr}</strong>.</div>
        
        <table>
            <thead>
                <tr>
                    <th>DAY</th>
                    <th>TIME</th>
                    <th>SUBJECT</th>
                    <th>TOPICS</th>
                    <th>TEACHER</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            </tbody>
        </table>
    </div>`;

        return {
            css: css,
            body: tableHTML,
            full: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timetable</title><style>${css}</style></head><body>${tableHTML}</body></html>`
        };
    }
});
