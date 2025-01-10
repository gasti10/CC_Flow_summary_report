document.addEventListener('DOMContentLoaded', () => {
    new Accordion('#accordion', {
        duration: 300,
        showMultiple: false,
        collapse: true,
    });

    // Selecciona todos los encabezados del acordeón
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            if(window.GLOBALS.charts[header.id]) {
                setTimeout(() => {
                    window.GLOBALS.charts[header.id].resize();
                }, 300);
            }
        });
    });
});