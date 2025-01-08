document.addEventListener('DOMContentLoaded', () => {
    // Datos simulados: reemplaza esto con la llamada al backend para obtener el JSON
    const sheetsData = [
        {
            "Sheet ID": "de573420",
            "Dimension": "2500x1250",
            "TotalReceived": 114,
            "TotalUsed": 117,
            "Colour": "Shinning Silver",
            "Thickness": "3MM",
            "Sheet": "Shinning Silver - Aodeli Australia / 2500x1250 3MM"
        },
        {
            "Sheet ID": "8e91c973",
            "Dimension": "4000x1250",
            "TotalReceived": 22,
            "TotalUsed": 23,
            "Colour": "Shinning Silver",
            "Thickness": "3MM",
            "Sheet": "Shinning Silver - Aodeli Australia / 4000x1250 3MM"
        },
        {
            "Sheet ID": "fe9ffa2e",
            "Dimension": "4000x1575",
            "TotalReceived": 41,
            "TotalUsed": 41,
            "Colour": "Shinning Silver",
            "Thickness": "3MM",
            "Sheet": "Shinning Silver - Aodeli Australia / 4000x1575 3MM"
        },
        {
            "Sheet ID": "b33a05d1",
            "Dimension": "2500x1250",
            "TotalReceived": 0,
            "TotalUsed": 3,
            "Colour": "Shinning Silver",
            "Thickness": "3MM",
            "Sheet": "Shinning Silver - Aodeli Australia / 2500x1250 3MM"
        }
    ];

    // 1. Preparar datos para el gráfico
    const sheets = sheetsData.map(sheet => sheet.Sheet);
    const totalReceived = sheetsData.map(sheet => sheet.TotalReceived);
    const totalUsed = sheetsData.map(sheet => sheet.TotalUsed);

    // 2. Crear el gráfico de barras vertical
    const ctx = document.getElementById('sheetsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dimensions,
            datasets: [
                {
                    label: 'Total Received',
                    data: totalReceived,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Used',
                    data: totalUsed,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Sheets Overview by Details'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Sheets'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                }
            }
        }
    });
});
