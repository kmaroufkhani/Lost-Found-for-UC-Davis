// Adds a new item to the backend database. Whoever configures the front-end stuff will
// need to get the date, time, kind, description, place, where_is_item, and img_url from
// the user's input
function sendNewItem(){
  // NOTE: Dates must be in the format YYYY-MM-DD else database search won't work
  
  // Format of database entries:
  //  (id, title, category, description, photo_url, date, time, location)
  let lost_or_found = 1; // lost item
  let title = document.getElementById("titleInput").value;
  let category = document.getElementById("categoryInput").value;
  let description = document.getElementById("descriptionInput").innerText;
  
  let photo_url = ""
  if( document.querySelector('#imgUpload').files[0] == null ){
    // set default image.
    photo_url = "http://ecs162.org:3000/images/mkdonnelly/DEFAULT.png"
  }else{
    photo_url = "http://ecs162.org:3000/images/mkdonnelly/" + document.querySelector('#imgUpload').files[0].name;
  }
  //let photo_url = "http://ecs162.org:3000/images/mkdonnelly/" + document.querySelector('#imgUpload').files[0].name;
  let date = document.getElementById("dateInput").value;
  let time = document.getElementById("timeInput").value;
  let location = document.getElementById("locationInput").value;
  
  
  let newItem = {"lost_or_found": lost_or_found, 
                 "title": title,
                 "category": category,
                 "description": description,
                 "photo_url": photo_url,
                 "date": date,
                 "time": time,
                 "location": location};
  
  let xhr = new XMLHttpRequest();
  xhr.open("POST","/addNewItem");
  xhr.setRequestHeader('Content-Type', 'application/json')
  
  xhr.addEventListener("load", function() {
    if (xhr.status == 200) {
      console.log("Success!")
    } else {
      console.log(xhr.responseText);
    }
  });
  xhr.send(JSON.stringify(newItem));
  
  alert("Your input has been saved!");
  
  //Redirect user back to main page
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/main.html";
}




// This code handles storing the data when the "submit" button
// is pressed. When this happens, we are redirected to searchResults
function searchResultsTimeRange() {

  let keyword = document.getElementById("searchInput2").value;
  let start_date = document.getElementById("dateInput-from").value;
  let start_time = document.getElementById("timeInput-from").value;
  let end_date = document.getElementById("dateInput-to").value;
  let end_time = document.getElementById("timeInput-to").value;
  let category = document.getElementById("categoryInput-srch").value;
  let location = document.getElementById("locationInput2").value;

  // Search by time range
  let search_type = 1;
  window.sessionStorage.setItem("keyword", keyword)
  window.sessionStorage.setItem("search_type", search_type);

  window.sessionStorage.setItem("start_date", start_date);
  window.sessionStorage.setItem("start_time", start_time);
  window.sessionStorage.setItem("end_date", end_date);
  window.sessionStorage.setItem("end_time", end_time);
  window.sessionStorage.setItem("category", category);
  window.sessionStorage.setItem("location", location);
  window.location =
    "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/searchResultsSeeker.html";
}


// This is the function that does the actual upload.
// You will need to set "imgUpload" as needed if you use a different name.
// Then just have this HTML in your main file, and everything should work

//     <form method="post" enctype="multipart/form-data">
//       <input id="imgUpload" type="file" accept="image/*" name="photo"/>
//     </form>

document.querySelector("#imgUpload").addEventListener("change", () => {
  console.log("Uploading image");

  // get the file with the file dialog box
  const selectedFile = document.querySelector("#imgUpload").files[0];
  // store it in a FormData object
  const formData = new FormData();
  formData.append("newImage", selectedFile, selectedFile.name);

  // build an HTTP request data structure
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/upload", true);
  xhr.onloadend = function(e) {
    // Get the server's response to the upload
    console.log(xhr.responseText);
    /*
        let newImage = document.querySelector("#cardImg");
        newImage.src = "http://ecs162.org:3000/images/mkdonnelly/"+selectedFile.name*/
  };

  // actually send the request
  xhr.send(formData);
});

/*********************************************************************************************************/

var google;
let map;

// This gets called when the Google maps librarys are fully downloaded
function initMap() {
  // stick a Google map onto the page
  map = new google.maps.Map(document.getElementById("map"), {
    center: {
      lat: 38.537,
      lng: -121.75
    },
    zoom: 15
  });

  // we plan to use the places service on this map
  let service = new google.maps.places.PlacesService(map);

  // get clicks on the map
  map.addListener("click", function(mapsMouseEvent) {
    let clickPt = mapsMouseEvent.latLng;
    // longitude and latitude
    console.log("Click at", clickPt.lat(), clickPt.lng());

    // set up CORS request to places API
    // gets everything within the radius
    let request = {
      location: clickPt,
      radius: 30 // meters
    };

    // do API CORS request to Google to return places near click
    service.nearbySearch(request, placesCallback);
  }); // end of initMap

  // called when places are returned
  function placesCallback(results, status) {
    console.log("placesCallback", status);
    for (let i = 0; i < results.length; i++) {
      console.log(results[i].name, results[i].types);
    }
    
    //Put the clicked location in the input field
    document.getElementById("locationInput").value = results[0].name;
  }
}


var google2;
// This gets called when the Google maps librarys are fully downloaded
function initMap2() {
  // stick a Google map onto the page
  let map2 = new google.maps.Map(document.getElementById("map2"), {
    center: {
      lat: 38.537,
      lng: -121.75
    },
    zoom: 15
  });

  // we plan to use the places service on this map
  let service = new google.maps.places.PlacesService(map2);

  // get clicks on the map
  map2.addListener("click", function(mapsMouseEvent) {
    let clickPt = mapsMouseEvent.latLng;
    // longitude and latitude
    console.log("Click at", clickPt.lat(), clickPt.lng());

    // set up CORS request to places API
    // gets everything within the radius
    let request = {
      location: clickPt,
      radius: 30 // meters
    };

    // do API CORS request to Google to return places near click
    service.nearbySearch(request, placesCallback);
  }); // end of initMap

  // called when places are returned
  function placesCallback(results, status) {
    console.log("placesCallback", status);
    for (let i = 0; i < results.length; i++) {
      console.log(results[i].name, results[i].types);
    }
    
    //Put the clicked location in the input field
    document.getElementById("locationInput2").value = results[0].name;
  }
}


//When search box is clicked, change the page layout
function goToSearch() {
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/seekerSearch.html";
}