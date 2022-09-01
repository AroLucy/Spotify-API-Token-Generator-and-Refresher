require('dotenv').config();
var request = require('request');
var cors = require('cors');
var cookieParser = require('cookie-parser');
const fs = require('fs');
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

// The code that's returned as a query parameter to the redirect URI

// To get code run this file with `node index.js` and go to `http://localhost:8888/login` and login with spotify, The redirected to `http://localhost:8888/callback?code=[CODE]&state=[STATE]`
// Copy CODE and replace the text below (remove brackets)

var code = '[Code From URI]';

// Random String Generator 

var generateRandomString = function(length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
};

// Scope / Credential definition 

var scopes = ['user-read-currently-playing'],
	clientId = process.env.CLIENT_ID;
clientSecret = process.env.CLIENT_SECRET;
redirectUri = process.env.REDIRECT_URI;
state = generateRandomString(16);

var credentials = {
	clientId: clientId,
	clientSecret: clientSecret,
	redirectUri: redirectUri
};

// Giving Spotify API Credentials 

var spotifyApi = new SpotifyWebApi({
	redirectUri: redirectUri,
	clientId: clientId,
	clientSecret: clientSecret
});

// Create the authorization URL

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

//console.log(authorizeURL);

// Setting Spotify API with new credentials 

var spotifyApi = new SpotifyWebApi(credentials);

// Express Setup

var app = express();
app.use(cors());

app.use(express.static(__dirname + '/'))
	.use(cors())
	.use(cookieParser());

// Login Page Redirect 

app.get('/login', function(req, res) {
	res.redirect(authorizeURL);
});

// Retrieve an access token and a refresh token
function GetRefreshToken() {
spotifyApi.authorizationCodeGrant(code).then(
	function(data) {
		console.log('The token expires in:');
		console.log(data.body['expires_in']);
		console.log('The access token is:');
		console.log(data.body['access_token']);
		console.log('The refresh token is:');
		console.log(data.body['refresh_token']);

		// Save Access Token to Auth.json

		let accessToken = {
			auth: data.body['access_token']
		};
		let refreshToken = {
			refresh : data.body['refresh_token']
		}
		let DataA = JSON.stringify(accessToken);
		fs.writeFileSync('Auth.json', DataA);
		let DataR = JSON.stringify(refreshToken);
		fs.writeFileSync('Refr.json', DataR),

		// Set the access token on the API object to use it in later calls
			
		spotifyApi.setAccessToken(data.body['access_token']);
spotifyApi.setRefreshToken(data.body['refresh_token']);
		
	},
	function(err) {
		console.log('Something went wrong!', err);
	}
);
};
					   
// clientId, clientSecret and refreshToken has been set on the api object previous to this call.

function refreshSpotifyToken() {
	let rawdataA = fs.readFileSync('Auth.json');
	let dataA = JSON.parse(rawdataA);
	spotifyApi.setAccessToken(dataA.auth);
	let rawdataR = fs.readFileSync('Refr.json');
	let dataR = JSON.parse(rawdataR);
	spotifyApi.setRefreshToken(dataR.refresh);
	if (dataR.refresh === undefined) {
		GetRefreshToken();
	}
	//console.log("ACC: " + dataA.auth + "\nREF: " + dataR.refresh)
	spotifyApi.refreshAccessToken().then(
		function(data) {
			console.log('The access token has been refreshed!');

			// Save the access token so that it's used in future calls
			spotifyApi.setAccessToken(data.body['access_token']);
			console.log('The access token is ' + data.body['access_token']);
			console.log('The token expires in ' + data.body['expires_in']);
			let accessToken = {
				auth: data.body['access_token']
			};
			let DataTW = JSON.stringify(accessToken);
			fs.writeFileSync('Auth.json', DataTW);
		},
		function(err) {
			console.log('Could not refresh access token');
			console.log(err)
		});
};
app.listen(8888, () => {
	refreshSpotifyToken();
	setInterval(refreshSpotifyToken, 1000*10);
})