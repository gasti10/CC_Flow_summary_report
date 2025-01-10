document.addEventListener('DOMContentLoaded', () => {
    new Accordion('.accordion', {
        duration: 300,
        showMultiple: false,
        collapse: true,
    });

    // Selecciona todos los encabezados del acordeón
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // Obtener el ítem padre
            const accordionItem = header.parentElement;
            const accordionBody = accordionItem.querySelector('.accordion-body');

            // Alternar la clase "active"
            const isActive = accordionItem.classList.contains('active');
            document.querySelectorAll('.accordion-item.active').forEach(item => {
                item.classList.remove('active');
                const body = item.querySelector('.accordion-body');
                body.style.maxHeight = null; // Resetea el alto
            });

            if (!isActive) {
                accordionItem.classList.add('active');
                accordionBody.style.maxHeight = `${accordionBody.scrollHeight}px`; // Ajusta al contenido
                if(window.GLOBALS.data[header.id]) {
                    setTimeout(() => {
                        if(!window.GLOBALS.charts[header.id]) generateChart(window.GLOBALS.data[header.id], header.id);
                        else window.GLOBALS.charts[header.id].update();
                    }, 300);
                }
            }
        });
    });
});