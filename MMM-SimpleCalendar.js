// ==============================
// Module: MMM-SimpleCalendar
// Version: 1.0.1 - April 2025
// Author: Joon Hee Jang
// License: MIT
// ==============================

Module.register("MMM-SimpleCalendar", {
    // Module configuration defaults
    defaults: {
        width: "1280px",
        height: "800px",
        startOfWeek: 0, // 0 for Sunday, 1 for Monday (default: 0)
        dayOfWeekFontSize: "14px",
        dayNumberFontSize: "40px",
        eventFontSize: "14px",
        mode: "monthly", // "monthly" or "6weeks" (default: "monthly")
        refreshInterval: 10 * 60 * 1000, // miliseconds inverval for refreshing calendar
        showEventTime: true, // true or false to show the event start time (default: true)
        timeFormat: "HH:mm" // Moment.js time format (default: "HH:mm", 12hr format: "hh:mm A", hour only: "hA")
    },

    // Load CSS files
    getStyles: function () {
        return ["MMM-SimpleCalendar.css"];
    },

    start: function () {
        Log.info("Starting MMM-SimpleCalendar...");

        // Event storage
        this.eventPool = [];

        // Build static DOM layout
        this.buildLayout();

        // Touch gesture tracking
        this.addTouchHandlers();
        this.touchStartX = 0;
        this.touchStartY = 0;

        // Add keydown event listener
        document.addEventListener("keydown", (event) => {
            this.handleKeyDown(event);
        });

        // Initial render
        this.updateCurrentDate(); 
        this.calculateFirstVisibleDate();
        this.refreshCalendar();

        // Periodically request new events
        setInterval(() => {
            console.log("update");
            this.requestEvents();
            this.updateCurrentDate(); 
            this.refreshCalendar();
        }, this.config.refreshInterval);
    },

    // DOM Output
    getDom: function () {
        console.log("getDom");
        return this.calendarContainer;
    },


    // =========================
    // === Initial Rendering ===
    // =========================

    // Current Date
    updateCurrentDate: function() {
        this.today = new Date();
        this.currentYear = this.today.getFullYear();
        this.currentMonth = this.today.getMonth();
        this.currentDay = this.today.getDate();
    },

    // Calendar Refreshing Logic
    refreshCalendar: function () {
        this.calculateVisibleDates();
        this.renderCalendar(this.currentYear, this.currentMonth);
        this.renderEvents(); // from this.eventPool
        this.updateDom();
    },


    // ====================
    // === Date Utility ===
    // ====================

    // Calculate The First Visible Date on the Calendar
    calculateFirstVisibleDate: function () {
        let firstVisibleDate;
        // Calculate the first visible date for 6weeks mode
        if (this.config.mode === "6weeks") {
            const dayOfWeek = this.today.getDay();
            const daysSinceStartOfWeek = (dayOfWeek - this.config.startOfWeek + 7) % 7;
            // First visible date in the calendar grid:
            firstVisibleDate = new Date(this.currentYear, this.currentMonth, this.currentDay - daysSinceStartOfWeek);
        } 
        // Calculate the first visible date for default "monthly" mode
        else { 
            const firstOfMonth = new Date(this.currentYear, this.currentMonth, 1);
            const startDayOfWeek = firstOfMonth.getDay(); // Sunday=0 .. Saturday=6
            const offset = (startDayOfWeek - this.config.startOfWeek + 7) % 7;
            // First visible date in the calendar grid:
            firstVisibleDate = new Date(this.currentYear, this.currentMonth, 1 - offset);
        }

        this.firstVisibleDate = firstVisibleDate
    },
    
    // Generate List of Visible Date
    calculateVisibleDates: function() {
        this.visibleDates = [];
        
        // Build the 42 visible dates array
        for (let i = 0; i < 42; i++) {
            const d = new Date(this.firstVisibleDate);
            d.setDate(this.firstVisibleDate.getDate() + i);
            this.visibleDates.push(d);
        }
    
        return this.visibleDates;
    },

    // Render Day numbers on the Calendar
    renderCalendar: function () {
        const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 42; i++) {
            const dayCell = this.dayCells[i];
            const dayNumber = dayCell.querySelector(".day-number");
            const currentDate = this.visibleDates[i];
    
            // Reset style to base
            dayCell.className = "day-cell";
            dayNumber.className = "day-number";
                
            // Set the date number (and month if it's the first day of the month)
            if (currentDate.getDate() === 1) {
                dayNumber.innerText = `${monthNamesShort[currentDate.getMonth()]} ${currentDate.getDate()}`;
            } else {
                dayNumber.innerText = currentDate.getDate();
            }
    
            // Add style based on whether it's in the current month
            if (currentDate.getMonth() === this.currentMonth) {
                dayCell.classList.add("current-month");
            } else {
                dayCell.classList.add("other-month");
            }
    
            // Highlight today's date
            if (
                currentDate.getFullYear() === this.today.getFullYear() &&
                currentDate.getMonth() === this.today.getMonth() &&
                currentDate.getDate() === this.today.getDate()
            ) {
                dayNumber.classList.add("today");
            }
        }

        console.log("calender");
    },


    // ======================
    // === Event Handling ===
    // ======================

    // Event Data Refresh
    requestEvents: function () {
        this.sendNotification("CALENDAR_EVENTS"); // ask MagicMirror to send events
    },

    notificationReceived: function (notification, payload) {
        if (notification === "CALENDAR_EVENTS") {
            this.eventPool = this.processEvents(payload);
        }
        this.renderEvents();
    },

    // Parse and Process Events
    processEvents: function (payload) {
        const processed = [];

        payload.forEach(event => {
            const start = new Date(+event.startDate);
            const end = new Date(+event.endDate - 1);

            const startYear = start.getFullYear();
            const startMonth = start.getMonth();
            const startDay = start.getDate();
            
            const endYear = end.getFullYear();
            const endMonth = end.getMonth();
            const endDay = end.getDate();

            const startDate = new Date(startYear, startMonth, startDay);
            const endDate = new Date(endYear, endMonth, endDay);
            const startTime = moment(start).format(this.config.timeFormat)
            const size = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))+1;
            
            // // Not used
            // const isMultiDay = (
            //     start.getFullYear() !== end.getFullYear() ||
            //     start.getMonth() !== end.getMonth() ||
            //     start.getDate() !== end.getDate()
            // ); 
        
            processed.push({
                startDate,
                endDate,
                size,
                startTime,
                title: event.title,
                isFullDay: event.fullDayEvent,
                // isMultiDay,
                // isRecurring: event.recurringEvent,
                color: event.color
            })
        })

        return processed;
    },

    // Render Events on the Calendar
    renderEvents: function () {
        // Reset all event rows
        if (this.eventGrid && this.eventGrid.length > 0) {
            for (let i = 0; i < this.eventGrid.length; i++) {
                if (this.eventGrid[i] && this.eventGrid[i].length > 0) {
                    this.eventGrid[i].forEach(eventRow => {
                        eventRow.innerHTML = "&nbsp;";
                        eventRow.className = "event-row";
                        eventRow.style.backgroundColor = "";
                        eventRow.style.color = "";
                        eventRow.style.width = "";
                    });
                }
            }
        }

        // Initialize usedRows
        const usedRows = [];
        for (let i = 0; i < 42; i++) {
            usedRows[i] = [false, false, false, false, false];
        }

        // Assign events
        for (let i = 0; i < 42; i++) {
            const currentDate = this.visibleDates[i];

            this.eventPool.forEach(event => {
                if (event && event.startDate) {
                    // Multi Day Event 
                    if (event.size > 1) {
                        this.handleMultiDayEvent(usedRows, i, currentDate, event)
                    } 
                    // Single day Event
                    else {
                        this.handleSingleDayEvent(usedRows, i, currentDate, event)
                    }

                }
            })
        }
        console.log("event");
    },

    // Helper function to get display text for events
    getDisplayText: function (event) {
        if (!event.isFullDay && this.config.showEventTime && event.startTime) {
            return `${event.startTime} ${event.title}`;
        }
        return event.title;
    },

    // Helper function to determine contrast color
    getContrastColor: function (hex) {
        // Remove hash if present
        hex = hex.replace('#', '');
    
        // Expand shorthand (e.g. #abc -> #aabbcc)
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
    
        // Convert to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
    
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
        // Return black for light backgrounds, white for dark ones
        return luminance > 0.6 ? '#000000' : '#ffffff';
    },

    // Multi Day Event Logic
    handleMultiDayEvent: function (usedRows, i, currentDate, event) {
        let firstCellId, lastCellId, rowId, size, remainingDaysInTheWeek, firstWeekSize, lastWeekSize
        
        // Frist day of event
        if (event.startDate.getTime() === currentDate.getTime()) {
            const displayText = this.getDisplayText(event)

            // Find the first available empty row
            for (let r = 0; r < 5; r++) {
                if (!usedRows[i][r]) {

                    firstCellId = i
                    rowId = r
                    size = event.size
                    remainingDaysInTheWeek = 7 - (firstCellId % 7);
                    lastCellId = Math.min(firstCellId + size -1, 41)
                    firstWeekSize = Math.min(size, remainingDaysInTheWeek);
                    lastWeekSize = (size - firstWeekSize) % 7

                    // First week of event
                    const eventRow = this.eventGrid[i][rowId]; 
                    const isFirstWeekOnly = size <= remainingDaysInTheWeek;
                    if (isFirstWeekOnly) {
                        eventRow.classList.add("multiday-event-firstweek-only");
                        eventRow.style.width = `calc(${firstWeekSize * 100}% - 6px)`;

                    } else {
                        eventRow.classList.add("multiday-event-firstweek");
                        eventRow.style.width = `calc(${firstWeekSize * 100}% - 6px)`;

                    }
                    eventRow.innerText = displayText;
                    eventRow.style.fontSize = this.config.eventFontSize;
                    eventRow.style.backgroundColor = event.color;
                    eventRow.style.color = this.getContrastColor(event.color);
                    
                    break;
                }
            }

            // Last week of event
            if (lastWeekSize > 0) {
                const eventRow = this.eventGrid[lastCellId - lastWeekSize + 1][rowId];
                eventRow.classList.add("multiday-event-lastweek");

                eventRow.innerText = displayText;
                eventRow.style.fontSize = this.config.eventFontSize;
                eventRow.style.backgroundColor = event.color;
                eventRow.style.color = this.getContrastColor(event.color);
                eventRow.style.width = `calc(${lastWeekSize * 100}% - 6px)`;
            }
        
            // Mid week of event
            for (let j = firstCellId + firstWeekSize; j < lastCellId - lastWeekSize + 1; j += 7) {
                const eventRow = this.eventGrid[j][rowId];
                const isLastWeek = lastWeekSize === 0;
                if (isLastWeek) {
                    eventRow.classList.add("multiday-event-lastweek");
                } else{
                    eventRow.classList.add("multiday-event-midweek");
                }
                eventRow.innerText = displayText;
                eventRow.style.fontSize = this.config.eventFontSize;
                eventRow.style.backgroundColor = event.color;
                eventRow.style.color = this.getContrastColor(event.color);
                eventRow.style.width = `calc(700% - 6px`; // Full week width (7 days)
            }

            // Mark row used for each day spanned
            for (let k = firstCellId; k <= lastCellId; k++) {
                usedRows[k][rowId] = true;
            }
        }
        console.log("MultiDayEvent");
    },

    // Single Day Event Logic
    handleSingleDayEvent: function (usedRows, i, currentDate, event) {
        if (event.startDate.getTime() === currentDate.getTime()) {
            // Find the first available empty row
            for (let r = 0; r < 5; r++) {
                if (!usedRows[i][r]) {
                    const eventRow = this.eventGrid[i][r];
                    
                    eventRow.innerText = this.getDisplayText(event);
                    eventRow.style.fontSize = this.config.eventFontSize;

                    // Render the event
                    if (event.isFullDay) {
                        eventRow.classList.add("single-fullday-event");
                        eventRow.style.backgroundColor = event.color;
                        eventRow.style.color = this.getContrastColor(event.color);
                    } else {
                        eventRow.classList.add("single-timed-event");
                        eventRow.style.color = event.color;
                    }

                    // Mark row used
                    usedRows[i][r] = true;
                    break;
                }
            }
        }
        console.log("SingleDayEvent");
    },


    // ==================
    // === DOM Layout ===
    // ==================

    // Module Layout
    buildLayout: function () {
        // Create main wrapper
        this.calendarContainer = document.createElement("div");
        this.calendarContainer.className = "calendar-container";
        this.calendarContainer.style.width = this.config.width;
        this.calendarContainer.style.height = this.config.height;
    
        // Left side
        this.leftSide = document.createElement("div");
        this.leftSide.className = "left-side";
        this.leftSide.innerHTML = "&nbsp"; // optional placeholder
    
        // Right side
        this.rightSide = document.createElement("div");
        this.rightSide.className = "right-side";
    
        // Weekday header row
        const weekdaysRow = this.buildWeekdayHeader();
        this.rightSide.appendChild(weekdaysRow);
    
        // Calendar grid
        this.calendarGrid = this.buildCalendarGrid();
        this.rightSide.appendChild(this.calendarGrid);
    
        // Assemble
        this.calendarContainer.appendChild(this.leftSide);
        this.calendarContainer.appendChild(this.rightSide);
    },
    
    // Day of week (SMTWTFS) header
    buildWeekdayHeader: function () {
        const weekdaysRow = document.createElement("div");
        weekdaysRow.className = "weekdays-row";
    
        const weekdayNames = ["S", "M", "T", "W", "T", "F", "S"];
        const adjustedWeekdayNames = [];
    
        // Adjust for start day of week
        for (let i = 0; i < 7; i++) {
            adjustedWeekdayNames.push(
                weekdayNames[(this.config.startOfWeek + i) % 7]
            );
        }

        // Render weekdays
        adjustedWeekdayNames.forEach(day => {
            const weekDay = document.createElement("div");
            weekDay.className = "weekday-cell";
            weekDay.innerText = day;
            weekDay.style.fontSize = this.config.dayOfWeekFontSize;
            weekdaysRow.appendChild(weekDay);
        });
    
        return weekdaysRow;
    },
    
    // Calendar grid
    buildCalendarGrid: function () {
        const calendarGrid = document.createElement("div");
        calendarGrid.className = "calendar-grid";
    
        this.dayCells = [];
        this.eventGrid = []; 

        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement("div");
            dayCell.className = "day-cell";
            dayCell.setAttribute("dayCell-index", i);
    
            // Date number placeholder
            const dayNumber = document.createElement("div");
            dayNumber.className = "day-number";
            dayNumber.innerText = "";
            dayNumber.style.fontSize = this.config.dayNumberFontSize;
            dayCell.appendChild(dayNumber);
    
            // Append event rows
            const eventsContainer = this.buildEventRows(i);
            dayCell.appendChild(eventsContainer);
    
            this.dayCells[i] = dayCell;
            calendarGrid.appendChild(dayCell);
        }
    
        return calendarGrid;
    },
    
    // Event row for each Day cell
    buildEventRows: function (dayIndex) {
        const eventsContainer = document.createElement("div");
        eventsContainer.className = "event-container";

        this.eventGrid[dayIndex] = [];
    
        for (let row = 0; row < 5; row++) {
            const eventRow = document.createElement("div");
            eventRow.className = "event-row";
            eventRow.setAttribute("row-index", row);

            // Event placeholder
            eventRow.innerHTML = "&nbsp";
            eventRow.style.fontSize = this.config.eventFontSize;
            this.eventGrid[dayIndex][row] = eventRow;
            eventsContainer.appendChild(eventRow);
        }
    
        return eventsContainer;
    },
    

    // ==================
    // === Navigation ===
    // ==================

    // Swipe Logic
    addTouchHandlers: function () {
        const horizontalThreshold = 50; // Adjust this value as needed (in pixels)
        const verticalThreshold = 30;   // Adjust this value as needed (in pixels)
        this.touchStartY = 0; // Initialize touchStartY

        // Capture initial positions
        this.calendarContainer.addEventListener("touchstart", (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY; 
        });

        // Capture final positions
        this.calendarContainer.addEventListener("touchend", (e) => {
            const deltaX = e.changedTouches[0].clientX - this.touchStartX;
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;

            // Check if the horizontal swipe exceeds the threshold AND the vertical movement is within the threshold
            if (Math.abs(deltaX) > horizontalThreshold && Math.abs(deltaY) < verticalThreshold) {
                if (deltaX > 0) {
                    this.navigateDay(-7); // Swipe right: go to previous week
                } else if (deltaX < 0) {
                    this.navigateDay(7);  // Swipe left: go to next week
                }
            }
        });
    },

    // Keyboard Logic
    handleKeyDown: function (event) {
        switch (event.key) {
            case "ArrowUp":
                this.navigateDay(-7); // Go to previous week
                break;
            case "ArrowDown":
                this.navigateDay(7); // Go to next week
                break;
        }
    },

    // Calendar Navigation
    navigateDay: function (delta) {
        this.firstVisibleDate.setDate(this.firstVisibleDate.getDate() + delta);
        this.calculateVisibleDates(); // Regenerate the visible dates
        console.log("navigateDay")
        this.refreshCalendar();
    },
});
    