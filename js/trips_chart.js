document.addEventListener('globalsReady', () => {
    const rawString = document.getElementById('deliveryDates').textContent;
    // Remove newline characters
    const cleanedString = rawString.replace(/\r?\n|\r/g, ' ');
    // Now trim and split by commas
    const rawDates = cleanedString.trim().split(',').map(d => d.trim()).filter(Boolean);;
    // Clean up spaces
    const trimmedDates = rawDates.map(d => d.replace(/\s+/g, ' '));

    // Now parse each date string
    // Format is "DD/MM/YYYY HH:MM:SS"
    // We need to convert it to something parseable by JavaScript Date
    // For example, split by ' ' to separate date and time
    const parsedDates = trimmedDates.map(dt => {
        const [datePart, timePart] = dt.split(' ');
        const [day, month, year] = datePart.split('/');
        // Rearrange to ISO format: "YYYY-MM-DDTHH:MM:SS"
        const isoString = `${year}-${month}-${day}T${timePart}`;
        return new Date(isoString);
    });

    // Now you have an array of JavaScript Date objects
    // You can aggregate them by day and count trips per day
    const dateCounts = {};
    parsedDates.forEach(dateObj => {
        const dayStr = dateObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
        dateCounts[dayStr] = (dateCounts[dayStr] || 0) + 1;
    });

    const labels = Object.keys(dateCounts).sort();
    const data = labels.map(l => dateCounts[l]);

    // Compute cumulative data
    let cumulativeTotal = 0;
    const cumulativeData = data.map(count => {
        cumulativeTotal += count;
        return cumulativeTotal;
    });

    const deliveriesAllowed = document.getElementById('deliveryAllowances').textContent;

    const ctx = document.getElementById('tripChart').getContext('2d');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Trips per Day',
                data: data,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76,175,80,0.2)',
                pointBackgroundColor: '#0af013',
                pointRadius: 6,
                fill: true,
                tension: 0.3
            },
            {
                label: 'Cumulative Trips',
                data: cumulativeData,
                borderColor: '#c1c536',
                backgroundColor: 'rgba(193,197,54,0.2)',
                pointBackgroundColor: '#ffc107',
                pointRadius: 6,
                fill: true,
                tension: 0.3
            },
            {
                label: 'Delivery Allowances',
                data: labels.map(() => deliveriesAllowed),
                borderColor: '#cb4335',       // Red line
                borderWidth: 4,
                borderDash: [5,5],            // Optional: makes the line dashed
                pointRadius: 0,               // No points, just a line
                fill: false
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 10000, //ms
                easing: 'easeInOutQuad', // Tipo de easing
                onProgress: function (animation) {
                    // Dibuja progresivamente mientras anima
                    const progress = animation.currentStep / animation.numSteps;
                    //console.log(`Progress: ${Math.round(progress * 100)}%`);
                },
                onComplete: function () {
                    //console.log('Animation complete');
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                },
                y: { beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Number of Trips by Date'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    labels: {
                        usePointStyle: true
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
    window.GLOBALS.charts.trips = chart;
});
