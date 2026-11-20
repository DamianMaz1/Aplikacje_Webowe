const czasEl = document.getElementById("czas");

let sekundy = 0;
let interwal = null; // null = stoper nie chodzi

function formatuj(s) {
	const min = Math.floor(s / 60);
	const sek = s % 60;
	if (min === 0) {
		return sek + "s";
	}
	return min + "min " + sek + "s";
}

function odswiez() {
	czasEl.textContent = formatuj(sekundy);
}

document.getElementById("start").addEventListener("click", () => {
	if (interwal !== null) return; // już działa – nie odpalamy drugi raz
	interwal = setInterval(() => {
		sekundy++;
		odswiez();
	}, 1000);
});

document.getElementById("stop").addEventListener("click", () => {
	clearInterval(interwal);
	interwal = null;
});

document.getElementById("reset").addEventListener("click", () => {
	clearInterval(interwal);
	interwal = null;
	sekundy = 0;
	odswiez();
});
