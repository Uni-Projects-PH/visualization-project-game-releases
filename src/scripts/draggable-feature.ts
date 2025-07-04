export function makeDraggable(element: HTMLDivElement) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.bottom = 'auto';
        element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.classList.remove('dragging');
    });
}


