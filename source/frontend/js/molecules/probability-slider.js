/**
 * Composant slider de probabilité d'intro vide.
 * Contrôle le pourcentage de chance de ne pas jouer de pre-roll.
 */

const ProbabilitySlider = {
    init(containerId, initialValue, onChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const valueDisplay = container.querySelector(".probability-slider__value");
        const input = container.querySelector(".slider-input");

        const pct = Math.round((initialValue || 0) * 100);
        input.value = pct;
        valueDisplay.textContent = pct + "%";

        input.addEventListener("input", () => {
            const val = parseInt(input.value, 10);
            valueDisplay.textContent = val + "%";
            onChange(val / 100);
        });
    },

    getValue(containerId) {
        const container = document.getElementById(containerId);
        const input = container.querySelector(".slider-input");
        return parseInt(input.value, 10) / 100;
    },
};
