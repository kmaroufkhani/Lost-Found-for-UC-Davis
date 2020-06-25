//The functions below take the user to the desired page
function goToHome() {
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/main.html";
}

function goToInput() {
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/inputItem.html";

}

function goToSeeker() {
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/seeker.html";
}

//When next is clicked, show the next items to be inputed
function nxtPage() {
  document.getElementById("mainBox").style.display = "none";
  document.getElementById("mainBox2").style.display = "block";
}
