const clientId = "fee1e2a0e61b41f2aa43f4f933ffc6f4";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    // We'll use this access token to authenticate our subsequent requests
    var accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);

    // Log what is returned to our request for our profile info to the console
    console.log(profile);

    // Fetch the playlists and store the response
    const playlists = await fetchPlaylists(accessToken);
    populate_playlists(playlists);
    populateUI(profile);
}

async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    console.log("Storing verifier in local storage: " + verifier);
    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "playlist-read-private user-read-private user-read-email");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      //Math.random() returns a floating-point, pesudo-random number in (0,1)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");
    console.log("Requesting access token with verifier" + verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    console.log("Got access token" + access_token);
    return access_token;
}

async function fetchProfile(token: string): Promise<UserProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

// Helper fct to get all the contents of a pages response.
// Returns an array of pages of the response.
async function get_paged_response(token: string, url: URL) {

  var results: Object[] = [];
  while (url !== null) {
    // Fetch a page of the contents and read it's content
    var rsp = await fetch(`${url}`, {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    var rspContents = await rsp.json();
    results.push(rspContents);
    // Update the URL to be the next page of results
    url = rspContents.next;
  }

  return results;
}

async function fetchPlaylists(token: string): Promise<any> {
  const responses = await get_paged_response(token, "https://api.spotify.com/v1/me/playlists");
  console.log(`Responses are: ${responses}`);

  let playlists: SimplifiedPlaylistObject[] = [];
  for (let rsp of responses) {
    rsp.items.forEach((item) => {
      playlists.push(item);
    });
  }

  console.log(`Playlists are ${JSON.stringify(playlists)}`);
  return playlists;

  // TODO use the paged results now rather than just the first page of results.
//  const result = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
//    method: "GET", headers: { Authorization: `Bearer ${token}` }
//  });

//  return await result.json();
  //TODO Make sure that we are handling paging properly, or at least requenting a large number of playlists off the bat.
}

// From the playlist object, get the tracks
async function get_playlist_album_art(token: string, tracksRef: string): Promise<Object> {
  console.log(`playlist href is: ${tracksRef}`);
  const responses = await get_paged_response(token, tracksRef);
  let images: Object[] = [];
  for (let rsp of responses) {
    rsp.items.map((item) => {
      if (item.track.type === "track") {
        images.push(item.track.album.images[0]);
      }
    });
  }

  return images;
}

// Display the album art on the screen in a grid
function display_album_art_grid(images: Object[]) {
  const dimensions = Math.floor(Math.sqrt(images.length));

  // Create the new body element with a grid of images
  let newBody = document.createElement("body");
  newBody.id = "imageBodyElement";

  for (let row = 0; row < dimensions; row++) {
    // Create a row div and add it to the body
    console.log(`Creating row ${row}`);
    let newRow = document.createElement("div");
    newRow.classList.add("row");
    newBody.appendChild(newRow);
    for (let col = 0; col < dimensions; col++) {
      // Create a column div and add it to the row
      console.log(`Creating column ${col}`);
      let newCol = document.createElement("div");
      newCol.classList.add("column");

      // Add the image to this cell
      const cellImage = new Image(200,200);
      console.log(`displaying image: ${images[0].url}`);
      cellImage.src = images[dimensions * row + col].url;
      newCol.appendChild(cellImage);
      newRow.appendChild(newCol);
    }
  }

  document.body = newBody;
}

function createPlaylistCard(playlist: SimplifiedPlaylistObject): Object {

  // Create a card div
  const card = document.createElement('div');
  card.classList.add("card");

  // Add an image for the playlist
  if (!(playlist.images == null) && playlist.images.length > 0) {
    const playlistImg = document.createElement('img');
    playlistImg.classList.add("card-img-top");
    playlistImg.src = playlist.images[0].url;
    card.appendChild(playlistImg);
  }

  // Create the card body
  const cardBody = document.createElement('div');
  cardBody.classList.add("card-body");
  // Add a title to the card body
  const cardTitle = document.createElement('h4');
  cardTitle.classList.add("card-title");
  cardTitle.innerText = playlist.name.replace(/["]+/g, '');
  cardBody.appendChild(cardTitle);
  // Add the body to the card
  card.appendChild(cardBody);

  return card;
}

function populate_playlists(playlists: SimplifiedPlaylistObject[]) {
  const playlists_elt = document.getElementById("playlists");
  const playlistCards = document.getElementById("playlistCards");

  const names = playlists.map((playlist) => playlist.name.replace(/["]+/g, ''))
                         .filter((name) => name.length > 1);

  document.getElementById("playlists_heading")!.innerText = "Your Playlists:";

  // Add each name in the to the list of displayed playlists
  playlists.forEach((playlist) => {
    var li = document.createElement('li');
    const displayName = playlist.name.replace(/["]+/g, '');
    // Don't display playlists without a name
    if (displayName.length === 0) {
      return;
    }
    li.appendChild(document.createTextNode(displayName));
    playlists_elt.appendChild(li);

    // Respond to being clicked
    li.addEventListener("click",async () => {
      // For now make the background colour blue
      li.style.backgroundColor = "blue";

      console.log(`Selecting playlist with name: ${playlist.name}`);
      // Get the tracks from the playlist

      const images = await get_playlist_album_art(accessToken, playlist.tracks.href);
      console.log(`images: ${JSON.stringify(images)}`);
      display_album_art_grid(images);
    });

    // Add a card for each playlist
    const card = createPlaylistCard(playlist);
    playlistCards.appendChild(card);
  });
}

function populateUI(profile: UserProfile) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    if ('images' in profile && profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    if ('external_urls' in profile) {
      document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    }
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    if ('images' in profile) {
      document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
    }
}
