import {FilterState} from "@/main.ts";

export function setupGameAddingMechanic(state: FilterState) {
    const openPopupButton = document.getElementById('open-popup-button') as HTMLButtonElement;
    const closePopupButton = document.getElementById('close-popup-button') as HTMLSpanElement;
    const addNewGameButton = document.getElementById('add-new-game-button') as HTMLButtonElement;
    const popup = document.getElementById('add-new-popup') as HTMLDivElement;
    const gameInput = document.getElementById('add-new-game') as HTMLInputElement;

    openPopupButton.addEventListener('click', () => {
        popup.style.display = 'block';
    });

    closePopupButton.addEventListener('click', () => {
        popup.style.display = 'none';
    });

    addNewGameButton.addEventListener('click', async () => {
        const gameName = gameInput.value.trim();
        if (!gameName) {
            alert('Bitte geben Sie einen Spielnamen ein.');
            return;
        }

        await state.addNewGame(gameName);

        popup.style.display = 'none';

        alert('Spiel hinzugefügt!');
    });

    window.addEventListener('click', (event) => {
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    });
}