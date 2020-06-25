let nextNumber = 0


// Adds a new search result with the given title, image url, category, location, date,
// and description
function addNewResult(title, img_url, category, location, date, description){
  // Take a copy of the template
  let template = document.getElementsByTagName("template")[0];
  let clone = template.content.cloneNode(true);
  
  
  // Make sure to set it to a unique ID so we can reference it later
  let entryName = "result" + nextNumber
  clone.getElementById("result").id = entryName
  
  // Add an event listener to the "More" and "Less" buttons
  clone.getElementById("more-button").addEventListener("click", function(){maximizeEntry(entryName)});
  clone.getElementById("less-button").addEventListener("click", function(){minimizeEntry(entryName)});
  
  nextNumber = nextNumber + 1;
  
  clone.getElementById("result-title").textContent = title;
  clone.getElementById("minimized-title").textContent = title;
  clone.getElementById("result-img").src = img_url;
  clone.getElementById("result-category").textContent = category;
  clone.getElementById("result-location").textContent = location;
  clone.getElementById("result-date").textContent = date;
  clone.getElementById("result-description").textContent = description;
  
  
  let resultList = document.getElementById("result-container");
  
  
  resultList.appendChild(clone);
}

// This function is used to query the backend database for entries that are
// in a certain time range
// Also, MAKE SURE DATES ARE IN THE FORM YYYY-MM-DD ELSE THIS WILL NOT WORK!!!!!
// times need to be in the format HH:MM:SS
function search(keyword, start_date, start_time, end_date, end_time, category, location){

  let searchRequest = {"lost_or_found": 0, // 0 == found
                       "keyword": keyword,
                       "start_date": start_date,
                       "start_time": start_time,
                       "end_date": end_date,
                       "end_time": end_time,
                       "category": category,
                       "location":location}
  
  let xhr = new XMLHttpRequest();
  xhr.open("POST","/search");
  xhr.setRequestHeader('Content-Type', 'application/json')
  
  xhr.addEventListener("load", function() {
    if (xhr.status == 200) {
      // Do something here with the results...
      console.log(xhr.responseText)
      
      var entries = JSON.parse(xhr.responseText)
      
      for(var i = 0; i < entries.length; i++){
        addNewResult(entries[i].title, 
                     entries[i].photo_url,
                     entries[i].category,
                     entries[i].location,
                     entries[i].date,
                     entries[i].description);
      }
      
    } else {
      console.log("ERROR IN search: ", xhr.responseText);
    }
  });
  xhr.send(JSON.stringify(searchRequest));
}


//Function that sets the identifiers (displayed under "showing results for")
// If we set 'search_type' equal to 1, then a search by date is performed
// If we set 'search_type' equal to 0, then a search by keyword is performed
function setupPage() {
  let keyword = window.sessionStorage.getItem('keyword')
  let start_date = window.sessionStorage.getItem('start_date')
  let start_time = window.sessionStorage.getItem('start_time')
  let end_date = window.sessionStorage.getItem('end_date')
  let end_time = window.sessionStorage.getItem('end_time')
  let category = window.sessionStorage.getItem('category')
  let location = window.sessionStorage.getItem('location')
  
  document.getElementById("identifiers").innerHTML = ""
  
  if( keyword != "" ){
    document.getElementById("identifiers").innerHTML += "\"" + keyword + "\""
  }
  
  if( start_date != "" && end_date != ""){
    document.getElementById("identifiers").innerHTML += start_date + " to " + end_date
  }
  
  if( category != "" ){
    document.getElementById("identifiers").innerHTML += ", " + category;
  }
  
  if( location != "" ){
    document.getElementById("identifiers").innerHTML += ", " + location
  }
    
  search(keyword, start_date, start_time, end_date, end_time, category, location)
}




function maximizeEntry(id_of_result){
  document.getElementById(id_of_result).querySelector("#minimized").style.display = "none"
  document.getElementById(id_of_result).querySelector("#result-entry").style.display = "flex";
}

function minimizeEntry(id_of_result){
  document.getElementById(id_of_result).querySelector("#minimized").style.display = "flex"
  document.getElementById(id_of_result).querySelector("#result-entry").style.display = "none";
}


function goToHome() {
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/main.html";
}


function editSearch(){
  window.location.href = "https://matthew-shayan-kasra-lost-and-found.glitch.me/user/finderSearch.html";
}