// ================== USTAWIENIA ==================
const canvas = document.getElementById("gra");
const ctx = canvas.getContext("2d");

const W = canvas.width; // 288
const H = canvas.height; // 512
const ZIEMIA_Y = H - 112; // górna krawędź podłoża (base.png ma 112 px wysokości)

const GRAWITACJA = 1400; // px/s² – przyspieszenie w dół
const SKOK = -380; // px/s – prędkość nadawana po spacji
const PREDKOSC = 120; // px/s – prędkość przesuwania rur
const PRZERWA = 115; // pionowa przerwa między górną a dolną rurą
const ODSTEP_MIN = 150; // poziomy odstęp między rurami (losowy)
const ODSTEP_MAX = 210;
const RURA_W = 52;
const PTAK_X = 60;
const PTAK_W = 34;
const PTAK_H = 24;

const CZAS_DUCHA = 5; // s – bonus "duch"
const CZAS_PRZEWIJANIA = 1.2; // s – bonus "fast forward"
const CZAS_REKORDU = 3; // s – animacja kręcenia przy rekordzie

const KLUCZ_TABLICY = "flappy-top5";

// ================== ZASOBY ==================
function wczytajObraz(src) {
	const obraz = new Image();
	obraz.src = src;
	return obraz;
}

const obrazy = {
	tlo: wczytajObraz("assets/Flappy Bird/background-day.png"),
	ziemia: wczytajObraz("assets/Flappy Bird/base.png"),
	rura: wczytajObraz("assets/Flappy Bird/pipe-green.png"),
	powitanie: wczytajObraz("assets/UI/message.png"),
	// klatki animacji ptaka: skrzydła w górze, w środku, w dole
	ptak: [
		wczytajObraz("assets/Flappy Bird/yellowbird-upflap.png"),
		wczytajObraz("assets/Flappy Bird/yellowbird-midflap.png"),
		wczytajObraz("assets/Flappy Bird/yellowbird-downflap.png"),
	],
	cyfry: [],
};
for (let i = 0; i <= 9; i++) {
	obrazy.cyfry.push(wczytajObraz("assets/UI/Numbers/" + i + ".png"));
}

const dzwieki = {
	skrzydlo: new Audio("assets/Sound Efects/wing.wav"),
	punkt: new Audio("assets/Sound Efects/point.wav"),
	uderzenie: new Audio("assets/Sound Efects/hit.wav"),
	upadek: new Audio("assets/Sound Efects/die.wav"),
	swoosh: new Audio("assets/Sound Efects/swoosh.wav"),
};

function graj(dzwiek) {
	// kopia, żeby ten sam dźwięk mógł grać kilka razy naraz
	const kopia = dzwiek.cloneNode();
	kopia.play().catch(() => {});
}

// ================== STAN GRY ==================
// stan: "powitanie" | "gra" | "spadanie" | "rekord" | "koniec"
let stan = "powitanie";
let ptak;
let rury;
let bonusy;
let wynik;
let duch; // ile sekund zostało bonusu "duch"
let przewijanie; // ile sekund zostało bonusu "fast forward"
let przesuniecieZiemi = 0;
let czasAnimacji = 0;
let czasPoUpadku = 0;
let czasRekordu = 0;

function losuj(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowaGra() {
	ptak = { x: PTAK_X, y: H / 2 - 40, vy: 0, kat: 0, naZiemi: false };
	rury = [];
	bonusy = [];
	wynik = 0;
	duch = 0;
	przewijanie = 0;
	dodajRure(W + 60);
}

function dodajRure(x) {
	// losowa wysokość przerwy i losowy odstęp do następnej rury
	const gora = losuj(60, ZIEMIA_Y - 60 - PRZERWA);
	rury.push({ x: x, gora: gora, odstep: losuj(ODSTEP_MIN, ODSTEP_MAX), zaliczona: false });

	// co jakiś czas w przerwie pojawia się bonus
	if (Math.random() < 0.2) {
		bonusy.push({
			x: x + RURA_W / 2,
			y: gora + PRZERWA / 2,
			typ: Math.random() < 0.5 ? "duch" : "przewijanie",
		});
	}
}

// ================== STEROWANIE ==================
function obslugaKlawiatury(e) {
	if (e.code !== "Space") return;
	e.preventDefault(); // spacja nie przewija strony
	if (e.repeat) return; // trzymanie spacji nie liczy się jako wiele skoków

	if (stan === "powitanie") {
		start();
	} else if (stan === "gra") {
		skok();
	} else if (stan === "koniec") {
		zagrajPonownie();
	}
}

function start() {
	stan = "gra";
	graj(dzwieki.swoosh);
	skok();
}

function skok() {
	if (przewijanie > 0) return; // podczas fast forward ptak leci sam
	ptak.vy = SKOK;
	graj(dzwieki.skrzydlo);
}

// ================== LOGIKA ==================
function aktualizuj(dt) {
	czasAnimacji += dt;

	if (stan === "powitanie") {
		// ptak lekko faluje w miejscu
		ptak.y = H / 2 - 40 + Math.sin(czasAnimacji * 4) * 6;
		przesunZiemie(PREDKOSC * dt);
	} else if (stan === "gra") {
		aktualizujGre(dt);
	} else if (stan === "spadanie") {
		aktualizujSpadanie(dt);
	} else if (stan === "rekord") {
		czasRekordu += dt;
		// ptak płynnie przesuwa się na środek ekranu
		ptak.x += (W / 2 - PTAK_W / 2 - ptak.x) * Math.min(1, dt * 4);
		ptak.y += (H / 2 - 60 - ptak.y) * Math.min(1, dt * 4);
		ptak.kat = czasRekordu * Math.PI * 2 * 1.5; // 1,5 obrotu na sekundę
		if (czasRekordu >= CZAS_REKORDU) {
			pokazEkranKoncowy(true);
		}
	}
}

function aktualizujGre(dt) {
	let mnoznikPredkosci = 1;

	if (przewijanie > 0) {
		// FAST FORWARD: świat pędzi 5x szybciej, ptak leci prosto na środek
		przewijanie -= dt;
		mnoznikPredkosci = 5;
		ptak.vy = 0;
		ptak.y += (H / 2 - 60 - ptak.y) * Math.min(1, dt * 5);
		ptak.kat = 0;
		if (przewijanie <= 0) {
			duch = Math.max(duch, 1); // chwila ochrony po wylądowaniu w nowym miejscu
		}
	} else {
		// FIZYKA: grawitacja zmienia prędkość, prędkość zmienia położenie
		ptak.vy += GRAWITACJA * dt;
		ptak.y += ptak.vy * dt;
		// pochylenie zależne od prędkości: w górę nosem do góry, w dół nosem w dół
		ptak.kat = Math.max(-0.45, Math.min(Math.PI / 2, ptak.vy * 0.0018));
	}

	if (duch > 0) duch -= dt;

	// przesuwanie świata w lewo
	const dx = PREDKOSC * mnoznikPredkosci * dt;
	przesunZiemie(dx);
	rury.forEach((r) => (r.x -= dx));
	bonusy.forEach((b) => (b.x -= dx));

	// nowa rura, gdy ostatnia odjechała wystarczająco daleko
	const ostatnia = rury[rury.length - 1];
	if (ostatnia.x + ostatnia.odstep < W) {
		dodajRure(ostatnia.x + ostatnia.odstep);
	}

	// usuwanie rur i bonusów, które wyjechały za ekran
	rury = rury.filter((r) => r.x + RURA_W > 0);
	bonusy = bonusy.filter((b) => b.x > -20);

	// punkty – za każdą minięta rurę
	rury.forEach((r) => {
		if (!r.zaliczona && r.x + RURA_W < ptak.x) {
			r.zaliczona = true;
			wynik++;
			graj(dzwieki.punkt);
		}
	});

	// zbieranie bonusów
	const srodekX = ptak.x + PTAK_W / 2;
	const srodekY = ptak.y + PTAK_H / 2;
	bonusy = bonusy.filter((b) => {
		const odleglosc = Math.hypot(b.x - srodekX, b.y - srodekY);
		if (odleglosc < 20) {
			if (b.typ === "duch") duch = CZAS_DUCHA;
			else przewijanie = CZAS_PRZEWIJANIA;
			graj(dzwieki.swoosh);
			return false; // usuwamy zebrany bonus
		}
		return true;
	});

	// zderzenie z ziemią – zawsze kończy grę
	if (ptak.y + PTAK_H >= ZIEMIA_Y) {
		ptak.y = ZIEMIA_Y - PTAK_H;
		graj(dzwieki.uderzenie);
		rozbijPtaka();
		return;
	}

	// zderzenie z rurą – chyba że działa bonus
	if (duch <= 0 && przewijanie <= 0 && kolizjaZRura()) {
		graj(dzwieki.uderzenie);
		rozbijPtaka();
	}
}

function kolizjaZRura() {
	// prostokąt ptaka, lekko pomniejszony, żeby kolizja była "uczciwa"
	const x = ptak.x + 3;
	const y = ptak.y + 3;
	const w = PTAK_W - 6;
	const h = PTAK_H - 6;

	return rury.some((r) => {
		const wPoziomie = x + w > r.x && x < r.x + RURA_W;
		const pozaPrzerwa = y < r.gora || y + h > r.gora + PRZERWA;
		return wPoziomie && pozaPrzerwa;
	});
}

function rozbijPtaka() {
	stan = "spadanie";
	ptak.vy = 0;
	czasPoUpadku = 0;
}

function aktualizujSpadanie(dt) {
	if (!ptak.naZiemi) {
		// ptak spada i obraca się dziobem w dół
		ptak.vy += GRAWITACJA * dt;
		ptak.y += ptak.vy * dt;
		ptak.kat = Math.min(Math.PI / 2, ptak.kat + dt * 8);

		if (ptak.y + PTAK_H >= ZIEMIA_Y) {
			// wbija się w ziemię
			ptak.y = ZIEMIA_Y - PTAK_H + 4;
			ptak.kat = Math.PI / 2;
			ptak.naZiemi = true;
			graj(dzwieki.upadek);
		}
	} else {
		czasPoUpadku += dt;
		if (czasPoUpadku > 0.7) {
			zakonczGre();
		}
	}
}

// ================== TABLICA WYNIKÓW (localStorage) ==================
function wczytajTablice() {
	try {
		const dane = JSON.parse(localStorage.getItem(KLUCZ_TABLICY));
		return Array.isArray(dane) ? dane : [];
	} catch (e) {
		return [];
	}
}

function zapiszWynik(nowyWynik) {
	const tablica = wczytajTablice();
	tablica.push(nowyWynik);
	tablica.sort((a, b) => b - a); // malejąco
	const top5 = tablica.slice(0, 5);
	try {
		localStorage.setItem(KLUCZ_TABLICY, JSON.stringify(top5));
	} catch (e) {}
	return top5;
}

function zakonczGre() {
	const staryRekord = wczytajTablice()[0] || 0;
	zapiszWynik(wynik);

	if (wynik > staryRekord) {
		// pobity rekord – 3 sekundy kręcenia, potem gratulacje
		stan = "rekord";
		czasRekordu = 0;
		ptak.naZiemi = false;
	} else {
		pokazEkranKoncowy(false);
	}
}

// ================== EKRAN KOŃCOWY ==================
const ekranKoncowy = document.getElementById("ekran-koncowy");
const przyciskPonownie = document.getElementById("zagraj-ponownie");

function pokazEkranKoncowy(czyRekord) {
	stan = "koniec";
	const tablica = wczytajTablice();

	if (czyRekord) {
		// po animacji ptak wraca na ziemię, żeby nie zasłaniał napisów
		ptak.x = PTAK_X;
		ptak.y = ZIEMIA_Y - PTAK_H + 4;
		ptak.kat = Math.PI / 2;
	}

	document.getElementById("wynik-gry").textContent = wynik;
	document.getElementById("najlepszy-wynik").textContent = tablica[0] || 0;
	document.getElementById("napis-gameover").classList.toggle("ukryty", czyRekord);
	document.getElementById("napis-gratulacje").classList.toggle("ukryty", !czyRekord);

	const lista = document.getElementById("top5");
	lista.innerHTML = "";
	tablica.forEach((w) => {
		const li = document.createElement("li");
		li.textContent = w + " pkt";
		lista.appendChild(li);
	});

	ekranKoncowy.classList.remove("ukryty");
	przyciskPonownie.addEventListener("click", zagrajPonownie);
	graj(dzwieki.swoosh);
}

function zagrajPonownie() {
	// usuwamy listener, żeby przy kolejnej grze nie dodać go drugi raz
	przyciskPonownie.removeEventListener("click", zagrajPonownie);
	przyciskPonownie.blur();
	ekranKoncowy.classList.add("ukryty");
	nowaGra();
	stan = "powitanie";
}

// ================== RYSOWANIE ==================
function przesunZiemie(dx) {
	przesuniecieZiemi = (przesuniecieZiemi + dx) % obrazy.ziemia.width || 0;
}

function rysuj() {
	// tło na całą planszę
	ctx.drawImage(obrazy.tlo, 0, 0, W, H);

	rysujRury();
	rysujBonusy();

	// podłoże – dwie kopie obok siebie, żeby przesuwało się bez przerwy
	ctx.drawImage(obrazy.ziemia, -przesuniecieZiemi, ZIEMIA_Y);
	ctx.drawImage(obrazy.ziemia, -przesuniecieZiemi + obrazy.ziemia.width, ZIEMIA_Y);

	if (stan === "powitanie") {
		ctx.drawImage(obrazy.powitanie, (W - 184) / 2, 50);
	}

	rysujPtaka();

	if (stan !== "powitanie") {
		rysujWynik();
	}
	rysujInformacje();
}

function rysujRury() {
	ctx.save();
	if (duch > 0) ctx.globalAlpha = 0.35; // bonus "duch" – rury przezroczyste

	rury.forEach((r) => {
		// dolna rura
		ctx.drawImage(obrazy.rura, r.x, r.gora + PRZERWA);

		// górna rura – ten sam obrazek odbity w pionie
		ctx.save();
		ctx.translate(r.x, r.gora);
		ctx.scale(1, -1);
		ctx.drawImage(obrazy.rura, 0, 0);
		ctx.restore();
	});

	ctx.restore();
}

function rysujBonusy() {
	bonusy.forEach((b) => {
		ctx.beginPath();
		ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
		ctx.fillStyle = b.typ === "duch" ? "#7fd3ff" : "#ffa040";
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "white";
		ctx.stroke();

		ctx.fillStyle = "white";
		ctx.font = "bold 13px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(b.typ === "duch" ? "D" : "F", b.x, b.y + 1);
	});
}

function rysujPtaka() {
	// animacja lotu: podmiana klatek góra → środek → dół → środek
	const kolejnosc = [0, 1, 2, 1];
	let klatka = 1;
	if (stan === "powitanie" || stan === "gra" || stan === "rekord") {
		klatka = kolejnosc[Math.floor(czasAnimacji * 12) % 4];
	}
	const obraz = obrazy.ptak[klatka];

	// smuga za ptakiem podczas fast forward
	if (przewijanie > 0 && stan === "gra") {
		for (let i = 3; i >= 1; i--) {
			ctx.save();
			ctx.globalAlpha = 0.15 * (4 - i);
			ctx.drawImage(obraz, ptak.x - i * 12, ptak.y);
			ctx.restore();
		}
	}

	// obrót wokół środka ptaka
	ctx.save();
	ctx.translate(ptak.x + PTAK_W / 2, ptak.y + PTAK_H / 2);
	ctx.rotate(ptak.kat);
	ctx.drawImage(obraz, -PTAK_W / 2, -PTAK_H / 2);
	ctx.restore();
}

function rysujWynik() {
	// wynik z obrazków cyfr, wyrównany do prawego górnego rogu
	const cyfry = String(wynik).split("");
	let x = W - 10;
	for (let i = cyfry.length - 1; i >= 0; i--) {
		const obraz = obrazy.cyfry[Number(cyfry[i])];
		x -= obraz.width;
		ctx.drawImage(obraz, x, 10);
	}
}

function rysujInformacje() {
	ctx.save();
	ctx.font = "bold 14px Arial";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.lineWidth = 3;
	ctx.strokeStyle = "black";
	ctx.fillStyle = "white";

	let tekst = "";
	if (stan === "gra" && przewijanie > 0) tekst = "FAST FORWARD!";
	else if (stan === "gra" && duch > 0) tekst = "Duch: " + duch.toFixed(1) + " s";
	if (tekst) {
		ctx.strokeText(tekst, 10, 14);
		ctx.fillText(tekst, 10, 14);
	}

	if (stan === "rekord") {
		ctx.font = "bold 24px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "gold";
		ctx.strokeText("NOWY REKORD!", W / 2, 100);
		ctx.fillText("NOWY REKORD!", W / 2, 100);
	}
	ctx.restore();
}

// ================== PĘTLA GRY ==================
let poprzedniCzas = null;

function petla(czas) {
	if (poprzedniCzas === null) poprzedniCzas = czas;
	// dt – ile sekund minęło od poprzedniej klatki (max 1/30 s, np. po zmianie karty)
	const dt = Math.min((czas - poprzedniCzas) / 1000, 1 / 30);
	poprzedniCzas = czas;

	aktualizuj(dt);
	rysuj();
	requestAnimationFrame(petla);
}

document.addEventListener("keydown", obslugaKlawiatury);
nowaGra();
requestAnimationFrame(petla);
