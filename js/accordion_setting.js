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
                if(window.GLOBALS.data[header.id]) {
                    accordionBody.style.maxHeight = `${Math.min(accordionBody.scrollHeight, 500)}px`; // Máximo de 500px
                    setTimeout(() => {
                        if(window.GLOBALS.charts[header.id]) window.GLOBALS.charts[header.id].resize();                     
                    }, 300);
                }
            }
        });
    });
});