"strict mode";

//Function that checks the url query and displays error message if query exists
function checkErr() {
  let query = window.location.search;
  if (query != "") {
    document.getElementById("errMsg").style.display = "block";
  }
  else {
    document.getElementById("errMsg").style.display = "none";
  }
}