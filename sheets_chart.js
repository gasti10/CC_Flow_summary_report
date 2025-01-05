document.addEventListener('DOMContentLoaded', () => {
    

    const config = {
        type: 'bar',
        data: sheetData,
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            }
        }
    };
    const ctx = document.getElementById('sheetsChart').getContext('2d');
    new Chart(ctx, config);
});