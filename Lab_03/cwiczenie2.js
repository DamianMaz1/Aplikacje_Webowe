const MALE = "abcdefghijklmnopqrstuvwxyz";
const CYFRY = "0123456789";
const WIELKIE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPECJALNE = "!@#$%^&*()-_=+[]{};:,.?/";

// losowa liczba całkowita z przedziału [od, do]
function losuj(od, doo) {
	return Math.floor(Math.random() * (doo - od + 1)) + od;
}

function losowyZnak(zestaw) {
	return zestaw[losuj(0, zestaw.length - 1)];
}

document.getElementById("generuj").addEventListener("click", () => {
	const min = parseInt(document.getElementById("min").value);
	const max = parseInt(document.getElementById("max").value);
	const wielkie = document.getElementById("wielkie").checked;
	const specjalne = document.getElementById("specjalne").checked;

	if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
		alert("Podaj poprawne długości (min ≥ 1 i max ≥ min).");
		return;
	}

	// zbieramy znaki, z których losujemy
	let znaki = MALE + CYFRY;
	const wymagane = []; // po jednym znaku z każdej zaznaczonej grupy
	if (wielkie) {
		znaki += WIELKIE;
		wymagane.push(losowyZnak(WIELKIE));
	}
	if (specjalne) {
		znaki += SPECJALNE;
		wymagane.push(losowyZnak(SPECJALNE));
	}

	const dlugosc = Math.max(losuj(min, max), wymagane.length);

	const haslo = [...wymagane];
	while (haslo.length < dlugosc) {
		haslo.push(losowyZnak(znaki));
	}

	// tasowanie, żeby wymagane znaki nie były zawsze na początku
	haslo.sort(() => Math.random() - 0.5);

	alert("Twoje hasło: " + haslo.join(""));
});
