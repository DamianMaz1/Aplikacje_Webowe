const tbody = document.getElementById("produkty");
const filtrInput = document.getElementById("filtr");
const sortSelect = document.getElementById("sortowanie");

let produkty = []; // oryginalne dane z API

async function pobierzDane() {
	try {
		const odp = await fetch("https://dummyjson.com/products");
		const dane = await odp.json();
		produkty = dane.products.slice(0, 30); // pierwsze 30 elementów
		wyswietl();
	} catch (blad) {
		tbody.innerHTML = '<tr><td colspan="3">Nie udało się pobrać danych.</td></tr>';
	}
}

function wyswietl() {
	const fraza = filtrInput.value.toLowerCase();

	// filtrowanie po tytule i opisie
	let lista = produkty.filter(
		(p) =>
			p.title.toLowerCase().includes(fraza) ||
			p.description.toLowerCase().includes(fraza)
	);

	// sortowanie po tytule (kopia tablicy, żeby nie psuć oryginalnej kolejności)
	if (sortSelect.value === "rosnaco") {
		lista = [...lista].sort((a, b) => a.title.localeCompare(b.title));
	} else if (sortSelect.value === "malejaco") {
		lista = [...lista].sort((a, b) => b.title.localeCompare(a.title));
	}

	tbody.innerHTML = ""; // czyścimy stare wiersze

	if (lista.length === 0) {
		tbody.innerHTML = '<tr><td colspan="3">Brak wyników.</td></tr>';
		return;
	}

	lista.forEach((p) => {
		const tr = document.createElement("tr");

		const tdImg = document.createElement("td");
		const img = document.createElement("img");
		img.src = p.thumbnail;
		img.alt = p.title;
		tdImg.appendChild(img);

		const tdTytul = document.createElement("td");
		tdTytul.textContent = p.title;

		const tdOpis = document.createElement("td");
		tdOpis.textContent = p.description;

		tr.appendChild(tdImg);
		tr.appendChild(tdTytul);
		tr.appendChild(tdOpis);
		tbody.appendChild(tr);
	});
}

filtrInput.addEventListener("input", wyswietl);
sortSelect.addEventListener("change", wyswietl);

pobierzDane();
