/**
 * Composant sélecteur de poids pour un pre-roll vidéo.
 * Permet de choisir un multiplicateur de x1 à x5.
 */

const WeightSelector = {
    create(relativePath, currentWeight, onChange) {
        const select = document.createElement("select");
        select.className = "weight-selector";
        select.dataset.path = relativePath;

        for (let i = 1; i <= 5; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = "x" + i;
            if (i === currentWeight) option.selected = true;
            select.appendChild(option);
        }

        select.addEventListener("change", () => {
            onChange(relativePath, parseInt(select.value, 10));
        });

        select.addEventListener("click", (e) => e.stopPropagation());

        return select;
    },
};
