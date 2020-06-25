const express = require("express");
const bodyParser = require("body-parser");
const assets = require("./assets");

// This stuff is for the image upload code
const multer = require("multer");
const fs = require("fs");
const sql = require("sqlite3").verbose();
const FormData = require("form-data");
const request = require('request');

// and some new ones related to doing the login process
const passport = require("passport");
// There are other strategies, including Facebook and Spotify, But we will use Google
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Some modules related to cookies, which indicate that the user
// is logged in
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");

// Setup passport, passing it information about what we want to do
passport.use(
  new GoogleStrategy(
    // object containing data to be sent to Google to kick off the login process
    // the process.env values come from the key.env file of your app
    // They won't be found unless you have put in a client ID and secret for
    // the project you set up at Google
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL:
        "https://matthew-shayan-kasra-lost-and-found.glitch.me/auth/accepted",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // where to go for info
      scope: ["profile", "email"] // the information we will ask for from Google
    },
    // function to call to once login is accomplished, to get info about user from Google;
    // it is defined down below.
    gotProfile
  )
);

// Start setting up the Server pipeline
const app = express();
console.log("setting up pipeline");

// take HTTP message body and put it as a string into req.body
app.use(bodyParser.urlencoded({ extended: true }));

// puts cookies into req.cookies
app.use(cookieParser());

// pipeline stage that echos the url and shows the cookies, for debugging.
app.use("/", printIncomingRequest);

// Now some stages that decrypt and use cookies

// express handles decryption of cooikes, storage of data about the session,
// and deletes cookies when they expire
app.use(
  expressSession({
    secret: "bananaBread", // a random string used for encryption of cookies
    maxAge: 6 * 60 * 60 * 1000, // Cookie time out - six hours in milliseconds
    // setting these to default values to prevent warning messages
    resave: true,
    saveUninitialized: false,
    // make a named session cookie; makes one called "connect.sid" as well
    name: "ecs162-session-cookie"
  })
);

// Initializes request object for further handling by passport
app.use(passport.initialize());

// If there is a valid cookie, will call passport.deserializeUser()
// which is defined below.  We can use this to get user data out of
// a user database table, them to specify place, kind of item, and a time range.  if we make one.
// Does nothing if there is no cookie
app.use(passport.session());

// currently not used
// using this route, we can clear the cookie and close the session
app.get("/logoff", function(req, res) {
  res.clearCookie("google-passport-example");
  res.redirect("/");
});

// The usual pipeline stages

// Public files are still serverd as usual out of /public
app.get("/*", express.static("public"));

// special case for base URL, goes to index.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

// Glitch assests directory
app.use("/assets", assets);

// stage to serve files from /user, only works if user in logged in

// If user data is populated (by deserializeUser) and the
// session cookie is present, get files out
// of /user using a static server.
// Otherwise, user is redirected to public splash page (/index) by
// requireLogin (defined below)
app.get("/user/*", requireUser, requireLogin, express.static("."));

// Now the pipeline stages that handle the login process itself

// Handler for url that starts off login with Google.
// The app (in public/index.html) links to here (note not an AJAX request!)
// Kicks off login process by telling Browser to redirect to Google.
app.get("/auth/google", passport.authenticate("google"));
// The first time its called, passport.authenticate sends 302
// response (redirect) to the Browser
// with fancy redirect URL that Browser will send to Google,
// containing request for profile, and
// using this app's client ID string to identify the app trying to log in.
// The Browser passes this on to Google, which brings up the login screen.

// Google redirects here after user successfully logs in.
// This second call to "passport.authenticate" will issue Server's own HTTPS
// request to Google to access the user's profile information with the
// temporary key we got from Google.
// After that, it calls gotProfile, so we can, for instance, store the profile in
// a user database table.
// Then it will call passport.serializeUser, also defined below.
// Then it either sends a response to Google redirecting to the /setcookie endpoint, below
// or, if failure, it goes back to the public splash page.
app.get(
  "/auth/accepted",
  passport.authenticate("google", {
    successRedirect: "/setcookie",
    failureRedirect: "/"
  })
);

// One more time! a cookie is set before redirecting
// to the protected homepage
// this route uses two middleware functions.
// requireUser is defined below; it makes sure req.user is defined
// The second one makse sure the referred request came from Google, and if so,
// goes ahead and marks the date of the cookie in a property called
// google-passport-example
app.get("/setcookie", requireUser, function(req, res) {
  if (req.get("Referrer") && req.get("Referrer").indexOf("google.com") != -1) {
    // mark the birth of this cookie
    res.cookie("google-passport-example", new Date());
    res.redirect("/user/main.html");
  } else {
    res.redirect("/");
  }
});

///////////////////////////////////////////////////////////////////////////////////
//                  CODE FOR HANDLING LOST&FOUND DATABASE                        //
///////////////////////////////////////////////////////////////////////////////////

// Entries for lost items in database will be in the form

//  (id, lost_or_found, title, category, description, photo_url, date, time, location)

// Where id is an Integer Primary Key automatically assigned when inserting a new row
// lost_or_found is 0 if the item was lost, and 1 if the item was found
// title is the title given to the lost&found item
// category is the type of item (i.e. "Keys", "Book", "Phone", and anything else you guys want to add)
// description is the description of the item that the finder inputs
// photo_url is the url of the image on the ecs162.org server
// date is the day that the item was found.  IT MUST BE IN THE FORMAT YYYY-MM-DD OR SEARCHING WILL NOT WORK!!!!
// time is the time of day that the item was found
// location is the place that the item was found

// Open lost&found database
const lostandfoundDB = new sql.Database("lost_and_found.db");

//Handle post requests using JSON
app.use(bodyParser.json());

// This is used when searching just based off of a time
// range, category, and location. This is used for
// Screen 8 in the google drive screenshots
function search(request, response, next) {
  // Some of these fields could be empty, so we need to check them
  // and build the SQL query as needed
  let cmd = "SELECT * FROM lost_and_found";
  
  let lost_or_found = request.body.lost_or_found;
  
  // Lost item
  if( lost_or_found == 1 ){
    cmd += " WHERE lost_or_found = 1 ";
  }else{
    // found item
    cmd += " WHERE lost_or_found = 0 ";
  }
  
  let keyword = request.body.keyword;
  console.log("KEYWORD IS  " + keyword)
  if( keyword != "" ){
    cmd += " AND title LIKE '%" + keyword + "%' OR description LIKE '%" + keyword + "%'"
  }
  
  let start_date = request.body.start_date;
  let end_date = request.body.end_date;
  
  if( start_date != "" && end_date != ""){
    cmd += " AND date BETWEEN date('" + start_date + "') AND date('" + end_date + "')";
  }
  
  let start_time = request.body.start_time;
  let end_time = request.body.end_time;
  
  if( start_time != "" && end_time != ""){
    cmd += " AND time BETWEEN time('" + start_time + "') AND time('" + end_time + "')";
  }

  let category = request.body.category;
  if( category != "" ){
    cmd += " AND category = \"" + category + "\"";
  }
  
  let location = request.body.location;
  if( location != ""){
    cmd += " AND location = \"" + location + "\"";
  }
  
  console.log(cmd)
  
  lostandfoundDB.all(cmd, function(err, rows){
    if(err){
      console.log(err)
    }else{
      response.json(rows);
      console.log(rows)
    }
  })
  
}

app.post("/search", search);


// Used for adding a new item to the database
// TODO: Need to somehow integrate this with login so that
//       only logged  them to specify place, kind of item, and a time range. in users can post a new item
function addNewItem(request, response, next) {
  //  (id, lost_or_found, title, category, description, photo_url, date, time, location)
  let lost_or_found = request.body.lost_or_found;
  let title = request.body.title;
  let category = request.body.category;
  let description = request.body.description;
  let photo_url = request.body.photo_url;
  let date = request.body.date;
  let time = request.body.time;
  let location = request.body.location;

  let cmd =
    "INSERT INTO lost_and_found (lost_or_found, title, category, description, photo_url, date, time, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  lostandfoundDB.run(
    cmd,
    lost_or_found,
    title,
    category,
    description,
    photo_url,
    date,
    time,
    location,
    function(err) {
      if (err) {
        console.log("ERROR INSERTING NEW ITEM: ", err.message);
        response.status(404).send("DID NOT INSERT NEW ITEM: DATABASE ERROR");
      } else {
        response.send("OK");
      }
    }
  );
}

app.post("/addNewItem", addNewItem);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                        Code for handling image upload                                    //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// This handles uploading to ecs162.org
function sendMediaStore(filename, serverRequest, serverResponse) {
  let apiKey = process.env.ECS162KEY;
  if (apiKey === undefined) {
    serverResponse.status(400);
    serverResponse.send("No API key provided");
  } else {
    // we'll send the image from the server in a FormData object
    let form = new FormData();

    // we can stick other stuff in there too, like the apiKey
    form.append("apiKey", apiKey);
    // stick the image into the formdata object
    form.append("storeImage", fs.createReadStream(__dirname + filename));
    // and send it off to this URL
    form.submit("http://ecs162.org:3000/fileUploadToAPI", function(
      err,
      APIres
    ) {
      // did we get a response from the API server at all?
      if (APIres) {
        // OK we did
        console.log("API response status", APIres.statusCode);
        // the body arrives in chunks - how gruesome!
        // this is the kind stream handling that the body-parser
        // module handles for us in Express.
        let body = "";
        APIres.on("data", chunk => {
          body += chunk;
        });
        APIres.on("end", () => {
          // now we have the whole body
          if (APIres.statusCode != 200) {
            serverResponse.status(400); // bad request
            serverResponse.send(" Media server says: " + body);
          } else {
            serverResponse.status(200);
            serverResponse.send(body);
          }

          // Delete any files in /images/ since we
          // are storing everything on ecs162.org
          fs.readdirSync("images/").forEach(file => {
            if (file != "readme.txt") {
              fs.unlink("images/" + file);
            }
          });
        });
      } else {
        // didn't get APIres at all
        serverResponse.status(500); // internal server error
        serverResponse.send("Media server seems to be down.");
      }
    });
  }
}

let storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, __dirname + "/images");
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
// let upload = multer({dest: __dirname+"/assets"});
let upload = multer({ storage: storage });

// Serve static files out of public directory
app.use(express.static("public"));

// Also serve static files out of /images
app.use("/images", express.static("images"));

// Handle a post request to upload an image.
app.post("/upload", upload.single("newImage"), function(request, response) {
  console.log(
    "Recieved",
    request.file.originalname,
    request.file.size,
    "bytes"
  );

  if (request.file) {
    // file is automatically stored in /images,
    // even though we can't see it.
    // We set this up when configuring multer

    console.log("/images/" + request.file.originalname);
    sendMediaStore("/images/" + request.file.originalname, request, response);
    //response.end("recieved "+request.file.originalname);
  } else throw "error";
});

///////////////////////////////////////////////////////////////////////////////////

// listen for requests
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

// Some functions called by the handlers in the pipeline above

// Function for debugging. Just prints the incoming URL, and calls next.
// Never sends response back.
function printIncomingRequest(req, res, next) {
  console.log("Serving", req.url);
  if (req.cookies) {
    console.log("cookies", req.cookies);
  }
  next();
}

// function that handles response from Google containint the profiles information.
// It is called by Passport after the second time passport.authenticate
// is called (in /auth/accepted/)
function gotProfile(accessToken, refreshToken, profile, done) {
  console.log("Google profile", profile);

  //Check if it is a valid UCD email
  let userEmail = profile.emails[0].value;
  let valid = userEmail.endsWith("@ucdavis.edu");

  let dbRowID = 1;

  //dbRowID set to -1 if non-UCD email
  //The value of dbRowID ends up in the req.user property of the request object
  if (!valid) {
    dbRowID = -1;

    //get Google to to make the user log in again
    request.get(
      "https://accounts.google.com/o/oauth2/revoke",
      {
        qs: { token: accessToken }
      },
      function(err, res, body) {
        console.log("revoked token");
      }
    );
  }

  done(null, dbRowID);
}

// Part of Server's sesssion set-up.
// The second operand of "done" becomes the input to deserializeUser
// on every subsequent HTTP request with this session's cookie.
// For instance, if there was some specific profile information, or
// some user history with this Website we pull out of the user table
// using dbRowID.  But for now we'll just pass out the dbRowID itself.
passport.serializeUser((dbRowID, done) => {
  console.log("SerializeUser. Input is", dbRowID);
  done(null, dbRowID);
});

// Called by passport.session pipeline stage on every HTTP request with
// a current session cookie (so, while user is logged in)
// This time,
// whatever we pass in the "done" callback goes into the req.user property
// and can be grabbed from there by other middleware functions
passport.deserializeUser((dbRowID, done) => {
  console.log("deserializeUser. Input is:", dbRowID);
  // here is a good place to look up user data in database using
  // dbRowID. Put whatever you want into an object. It ends up
  // as the property "user" of the "req" object.
  //let userData = { userData: "maybe data from db row goes here" };
  done(null, dbRowID);
});

function requireUser(req, res, next) {
  if (req.user == -1) {
    res.redirect(
      "https://matthew-shayan-kasra-lost-and-found.glitch.me/index.html?email=notUCD"
    );
  } else {
    console.log("user is", req.user);
    next();
  }
}

function requireLogin(req, res, next) {
  console.log("checking:", req.cookies);
  if (!req.cookies["ecs162-session-cookie"]) {
    res.redirect("/");
  } else {
    next();
  }
}
