const formularz = document.getElementById("formularz");
const podziekowanie = document.getElementById("podziekowanie");

formularz.addEventListener("submit", function (zdarzenie) {
  zdarzenie.preventDefault();
  podziekowanie.textContent = "Dziękuję za wiadomość!";
  formularz.reset();
});
