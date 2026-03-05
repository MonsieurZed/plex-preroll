/**
 * Composant toggle switch réutilisable.
 * Crée un interrupteur on/off pour un pre-roll vidéo.
 */

const ToggleSwitch = {
    create(id, checked, onChange) {
        const label = document.createElement("label");
        label.className = "toggle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "toggle__input";
        input.checked = checked;
        input.dataset.id = id;
        input.addEventListener("change", () => onChange(id, input.checked));

        const slider = document.createElement("span");
        slider.className = "toggle__slider";

        label.appendChild(input);
        label.appendChild(slider);

        return label;
    },
};
